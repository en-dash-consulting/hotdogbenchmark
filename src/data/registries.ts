/**
 * Reading the two registries off disk.
 *
 * The schemas in `src/schema/` are pure so they can run anywhere; this module
 * is the Node-only edge that turns files into validated objects. The runner CLI
 * and the site build both come through here.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
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

/** Repository root, resolved from this file rather than from `process.cwd()`. */
export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url))

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
