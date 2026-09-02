/**
 * Reading the three registries off disk.
 *
 * The schemas in `src/schema/` are pure so they can run anywhere; this module
 * is the Node-only edge that turns files into validated objects. The runner CLI
 * and the site build both come through here.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve as resolvePath } from 'node:path'
import {
  enabledQuestions,
  parseQuestionsRegistry,
  type QuestionEntry,
  type QuestionsRegistry,
} from '../schema/questions.ts'
import {
  enabledModels,
  parseModelsRegistry,
  type ModelEntry,
  type ModelsRegistry,
} from '../schema/models.ts'
import {
  enabledConditions,
  parseConditionsRegistry,
  type ConditionEntry,
  type ConditionsRegistry,
} from '../schema/conditions.ts'

/**
 * The repository root, found by walking up from the working directory to the
 * nearest `package.json`.
 *
 * Deliberately *not* derived from `import.meta.url`. The Astro build bundles
 * this module into `dist/.prerender/chunks/`, where a relative walk from the
 * module's own location points at `dist/` and every data file appears to be
 * missing — a failure that only shows up at build time, never in tests.
 *
 * Falls back to the working directory when no `package.json` is found, which is
 * the right answer for someone running the CLI from an unpacked tarball.
 */
function findRepoRoot(from: string = process.cwd()): string {
  let current = resolvePath(from)
  for (;;) {
    if (existsSync(join(current, 'package.json'))) return current + '/'
    const parent = dirname(current)
    if (parent === current) return resolvePath(from) + '/'
    current = parent
  }
}

export const REPO_ROOT = findRepoRoot()

function readJson(path: string): unknown {
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (cause) {
    throw new Error(`Could not read ${path}`, { cause })
  }
  try {
    return JSON.parse(raw)
  } catch (cause) {
    throw new Error(`${path} is not valid JSON`, { cause })
  }
}

/** Load and validate `questions.json`. Throws a message naming the file. */
export function loadQuestionsRegistry(root: string = REPO_ROOT): QuestionsRegistry {
  const path = root + 'questions.json'
  return parseQuestionsRegistry(readJson(path), path)
}

/** The enabled questions, in file order. This is what the runner asks. */
export function loadQuestions(root: string = REPO_ROOT): QuestionEntry[] {
  return enabledQuestions(loadQuestionsRegistry(root))
}

/** Load and validate `models.json`. Throws a message naming the file. */
export function loadModelsRegistry(root: string = REPO_ROOT): ModelsRegistry {
  const path = root + 'models.json'
  return parseModelsRegistry(readJson(path), path)
}

/** The enabled models, in file order. This is what the runner asks. */
export function loadModels(root: string = REPO_ROOT): ModelEntry[] {
  return enabledModels(loadModelsRegistry(root))
}

/** Load and validate `conditions.json`. Throws a message naming the file. */
export function loadConditionsRegistry(root: string = REPO_ROOT): ConditionsRegistry {
  const path = root + 'conditions.json'
  return parseConditionsRegistry(readJson(path), path)
}

/** The enabled conditions, control first. This is what the runner runs. */
export function loadConditions(root: string = REPO_ROOT): ConditionEntry[] {
  return enabledConditions(loadConditionsRegistry(root))
}
