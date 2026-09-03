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
import { runInit } from './cli/init.ts'
import { DEFAULT_CONCURRENCY, DEFAULT_SAMPLES, DEFAULT_TIMEOUT_MS } from './runner/run.ts'
import { CADENCES, DEFAULT_CADENCE, isCadence, type Cadence } from './data/paths.ts'

const USAGE = `hotdogbenchmark — ask every model whether a hot dog is a sandwich

Usage:
  npm run bench -- <command> [options]

Commands:
  run                 Run the benchmark and write data/runs/<edition>.json
  providers           List providers and whether a key is configured
  data validate       Check every file under data/ against the schema
  data index          Regenerate data/index.json from the committed run files
  smoke               Make one live call to one provider and print the result
                      (--all pings every provider that has a key)
  record              Capture fresh mock fixtures from one provider (live)
  init                Point the benchmark at new questions: rewrite questions.json
                      and conditions.json, drop stale fixtures and mock editions
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
  --cadence <week|day>
                      One edition per ISO week (default), written as data/runs/<year>-W<week>.json,
                      or one per UTC day, written as data/runs/<year>-<month>-<day>.json.
                      Also read from BENCH_CADENCE. Daily costs 7x weekly at the same sample count
  --out <path>        Override the output file path

Options for \`smoke\` and \`record\`:
  --provider <id>     Which provider to call
  --model <id>        Which of that provider's models; default is its first enabled model
  --all               (smoke) Ping every enabled model that has a key configured
  --prompt <text>     (smoke) Override the question asked

Options for \`init\` (prompts for everything when run with no --question from a terminal):
  --question <text>   The prompt to send (repeatable). "One word answer." is appended if missing
  --subject <phrase>  The subject as it reads in a sentence, like "a burrito" (one per question)
  --id <slug>         Question id; default is the subject slugged without its article (repeatable)
  --title <text>      Report title; default is "The <Subject> Question" (repeatable)
  --tagline <text>    One line under the title (repeatable)
  --assert <template> System prompt for the asserted arm; "{subject}" is filled per question
  --deny <template>   System prompt for the denied arm
  --no-framings       Write the control condition only
  --force             Also remove real editions (isMock: false) under data/runs/
  --yes               Skip the confirmation prompt
  --dry-run           Print what would change and write nothing

Exit codes:
  0  success (at least one model answered)
  1  every job failed
  2  invalid usage, a registry that would not validate, or an init that was not confirmed
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

/**
 * The edition cadence for `run`: flag beats environment beats the weekly
 * default. Returns the offending string when it is not a known cadence, so
 * the caller can refuse it by name rather than silently running weekly.
 */
function cadenceOption(argv: string[]): { cadence: Cadence } | { invalid: string } {
  const raw = flagValue(argv, '--cadence') ?? process.env.BENCH_CADENCE ?? DEFAULT_CADENCE
  return isCadence(raw) ? { cadence: raw } : { invalid: raw }
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

/** Every value of a repeatable `--flag value`, in argv order. */
function repeatFlag(argv: string[], flag: string): string[] {
  const values: string[] = []
  argv.forEach((arg, index) => {
    if (arg !== flag) return
    const value = argv[index + 1]
    if (value !== undefined && !value.startsWith('--')) values.push(value)
  })
  return values
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

    case 'run': {
      const cadence = cadenceOption(argv)
      if ('invalid' in cadence) {
        console.error(
          `Unknown cadence: ${JSON.stringify(cadence.invalid)}\n` +
            `Expected one of: ${CADENCES.join(', ')} (from --cadence or BENCH_CADENCE)`,
        )
        return 2
      }
      return runBenchCommand({
        cadence: cadence.cadence,
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
    }

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

    case 'init':
      return runInit({
        questions: repeatFlag(argv, '--question'),
        subjects: repeatFlag(argv, '--subject'),
        ids: repeatFlag(argv, '--id'),
        titles: repeatFlag(argv, '--title'),
        taglines: repeatFlag(argv, '--tagline'),
        assertTemplate: flagValue(argv, '--assert'),
        denyTemplate: flagValue(argv, '--deny'),
        framings: !argv.includes('--no-framings'),
        siteName: flagValue(argv, '--site-name'),
        byline: flagValue(argv, '--byline'),
        publisherName: flagValue(argv, '--publisher'),
        publisherUrl: flagValue(argv, '--publisher-url'),
        repository: flagValue(argv, '--repository'),
        force: argv.includes('--force'),
        yes: argv.includes('--yes'),
        dryRun: argv.includes('--dry-run'),
      })

    default:
      console.error(`Unknown command: ${command}\n`)
      console.error(USAGE)
      return 2
  }
}

process.exitCode = await main(process.argv.slice(2))
