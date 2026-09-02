/**
 * The generated `data/index.json` manifest.
 *
 * The site needs to know what editions exist and roughly what is in them
 * without opening and parsing every run file. This is that summary, and it is
 * generated rather than hand-maintained (`npm run data:index`).
 *
 * It contains **no timestamp of its own**. Regenerating it from unchanged run
 * files must produce a byte-identical file, otherwise every CI run would show a
 * spurious diff and nobody would notice a real one.
 */
import { z } from 'zod'
import { editionKeySchema, isoWeekSchema, verdictSchema } from './run.ts'

/** How one question went in one edition. */
export const questionTallySchema = z.object({
  questionId: z.string().min(1),
  /** The condition these counts describe. The manifest tallies the control arm only. */
  conditionId: z.string().min(1),
  /** Models that produced at least one sample. */
  okCount: z.number().int().nonnegative(),
  /** Models that produced none. */
  errorCount: z.number().int().nonnegative(),
  /** Majority-verdict counts across models. Models that errored are in none of these. */
  verdicts: z.record(verdictSchema, z.number().int().nonnegative()),
})
export type QuestionTally = z.infer<typeof questionTallySchema>

export const manifestEntrySchema = z.object({
  /** The ISO week the run happened in. A daily edition still records its week. */
  isoWeek: isoWeekSchema,
  /**
   * The edition this entry is: the week at weekly cadence, the UTC date at
   * daily cadence. Always present here even though a run file may omit it,
   * because the manifest is regenerated and the site should not have to
   * repeat the fallback.
   */
  editionKey: editionKeySchema,
  /** Repository-relative path to the run file, e.g. `data/runs/2026-W36.json`. */
  path: z.string().min(1),
  runId: z.string().min(1),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  isMock: z.boolean(),
  /** Question ids asked in this edition, in the order the run recorded them. */
  questionIds: z.array(z.string().min(1)),
  /** Condition ids run in this edition, control first. A migrated version-1 run has only the control. */
  conditionIds: z.array(z.string().min(1)),
  /** Distinct models evaluated, counted once even when they answered several questions. */
  modelCount: z.number().int().nonnegative(),
  questions: z.array(questionTallySchema),
})
export type ManifestEntry = z.infer<typeof manifestEntrySchema>

export const dataManifestSchema = z.object({
  /** Schema generation of the *run files* this manifest summarizes. */
  schemaVersion: z.number().int().positive(),
  /** Every edition, newest first. */
  runs: z.array(manifestEntrySchema),
})
export type DataManifest = z.infer<typeof dataManifestSchema>
