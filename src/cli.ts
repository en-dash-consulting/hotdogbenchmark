#!/usr/bin/env node
/**
 * The benchmark CLI. Node runs this file directly by stripping its types.
 *
 * This is the Node-only edge of the project: it reads the environment, reads and
 * writes files, and parses argv. Everything it calls into (`src/runner`,
 * `src/providers`) stays runtime-agnostic so the same logic can run in a browser.
 */
import { configuredProviders, loadLocalEnv } from './env.ts'
import { validateAllRuns, writeManifest } from './data/index.ts'
import { runSmoke, runSmokeAll } from './cli/smoke.ts'
import { runBenchCommand } from './cli/run-command.ts'
import { runRecord } from './cli/record.ts'
import { DEFAULT_CONCURRENCY, DEFAULT_SAMPLES, DEFAULT_TIMEOUT_MS } from './runner/run.ts'

const USAGE = `hotdogbenchmark — ask every model whether a hot dog is a sandwich

Usage:
  npm run bench -- <command> [options]

Commands:
  run                 Run the benchmark and write data/runs/<isoWeek>.json
  providers           List providers and whether a key is configured
  data validate       Check every file under data/ against the schema
  data index          Regenerate data/index.json from the committed run files
  smoke               Make one live call to one provider and print the result
                      (--all pings every provider that has a key)
  record              Capture fresh mock fixtures from one provider (live)
  help                Show this message

Options for \`run\`:
  --mock              Replay recorded fixtures; no API keys and no network needed
  --dry-run           Print the plan (questions, models, samples) and exit
  --samples <n>       Samples per model per question (default 3)
  --concurrency <n>   Parallel model x question jobs (default 3)
  --timeout <ms>      Per-request timeout (default 60000)
  --models <ids>      Comma-separated model ids; default is every enabled model
  --questions <ids>   Comma-separated question ids; default is every enabled question
  --conditions <ids>  Comma-separated condition ids; default is every enabled condition.
                      The control is always run, so "--conditions control" is the cheap path
  --out <path>        Override the output file path

Options for \`smoke\` and \`record\`:
  --provider <id>     Which provider to call
  --model <id>        Which of that provider's models; default is its first enabled model
  --all               (smoke) Ping every enabled model that has a key configured
  --prompt <text>     (smoke) Override the question asked

Exit codes:
  0  success (at least one model answered)
  1  every job failed
  2  invalid usage
`

/** Print which providers have a key configured. Never prints a key. */
function printProviders(): void {
  const statuses = configuredProviders()
  const width = Math.max(...statuses.map((s) => s.provider.length))
  console.log('Provider'.padEnd(width) + '  Key variable            Status')
  for (const { provider, envVar, configured } of statuses) {
    const status = configured ? 'configured' : 'not set'
    console.log(`${provider.padEnd(width)}  ${envVar.padEnd(22)}  ${status}`)
  }
  const count = statuses.filter((s) => s.configured).length
  console.log(`\n${count} of ${statuses.length} providers configured.`)
  if (count === 0) {
    console.log('Run `npm run bench -- run --mock` to try the pipeline with no keys at all.')
  }
}

/** Read a positive number from the environment, falling back to a default. */
function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined) return fallback
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

/** Read a numeric `--flag value`, falling back to a default. */
function numberFlag(argv: string[], flag: string, fallback: number): number {
  const raw = flagValue(argv, flag)
  if (raw === undefined) return fallback
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

/** Read a comma-separated `--flag a,b,c`, or an empty list. */
function listFlag(argv: string[], flag: string): string[] {
  const raw = flagValue(argv, flag)
  if (!raw) return []
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Read `--flag value` from argv, or undefined. */
function flagValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag)
  if (index === -1) return undefined
  const value = argv[index + 1]
  return value === undefined || value.startsWith('--') ? undefined : value
}

/**
 * `data validate` and `data index`.
 *
 * Validation reports every bad file rather than only the first, so a
 * contributor fixing several sees them all in one run.
 */
function runDataCommand(subcommand: string | undefined): number {
  switch (subcommand) {
    case 'validate': {
      const problems = validateAllRuns()
      if (problems.length > 0) {
        console.error(`${problems.length} invalid file(s) under data/:\n`)
        for (const problem of problems) console.error(problem + '\n')
        return 1
      }
      console.log('All files under data/ validate against the schema.')
      return 0
    }

    case 'index': {
      const { path, runs } = writeManifest()
      console.log(`Wrote ${path} (${runs} run${runs === 1 ? '' : 's'}).`)
      return 0
    }

    default:
      console.error(`Usage: npm run bench -- data <validate|index>`)
      return 2
  }
}

export async function main(argv: string[]): Promise<number> {
  loadLocalEnv()
  const [command] = argv

  switch (command) {
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      console.log(USAGE)
      return 0

    case 'providers':
      printProviders()
      return 0

    case 'run':
      return runBenchCommand({
        mock: argv.includes('--mock'),
        dryRun: argv.includes('--dry-run'),
        // Flag beats environment beats built-in default, so the weekly
        // workflow can set BENCH_SAMPLES once without editing any command.
        samples: numberFlag(argv, '--samples', envNumber('BENCH_SAMPLES', DEFAULT_SAMPLES)),
        concurrency: numberFlag(
          argv,
          '--concurrency',
          envNumber('BENCH_CONCURRENCY', DEFAULT_CONCURRENCY),
        ),
        timeoutMs: numberFlag(argv, '--timeout', envNumber('BENCH_TIMEOUT_MS', DEFAULT_TIMEOUT_MS)),
        modelIds: listFlag(argv, '--models'),
        questionIds: listFlag(argv, '--questions'),
        conditionIds: listFlag(argv, '--conditions'),
        out: flagValue(argv, '--out'),
      })

    case 'data':
      return runDataCommand(argv[1])

    case 'smoke': {
      const prompt = flagValue(argv, '--prompt')
      if (argv.includes('--all')) return runSmokeAll({ prompt })

      const provider = flagValue(argv, '--provider')
      if (!provider) {
        console.error('Usage: npm run bench:smoke -- --provider <id>   (or --all)')
        return 2
      }
      return runSmoke({ provider, model: flagValue(argv, '--model'), prompt })
    }

    case 'record': {
      const provider = flagValue(argv, '--provider')
      if (!provider) {
        console.error('Usage: npm run bench:record -- --provider <id>')
        return 2
      }
      return runRecord({ provider, model: flagValue(argv, '--model') })
    }

    default:
      console.error(`Unknown command: ${command}\n`)
      console.error(USAGE)
      return 2
  }
}

process.exitCode = await main(process.argv.slice(2))
