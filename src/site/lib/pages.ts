/**
 * Every page the site builds, with what a crawler wants to know about each.
 *
 * The sitemap, llms.txt and the build test all read this list, so a page
 * added to src/site/pages/ without an entry here fails the build test rather
 * than silently going unlisted. Last-modified dates come from the data: a
 * report changes when its edition does, an archived edition never changes
 * after it is published, and the prose pages carry no date because their
 * text changes with the code, not with the data.
 */
import { getAllRuns, getLatestRun, getQuestions } from './data.ts'
import { treatedConditions } from './sensitivity.ts'
import { RUN_YOUR_OWN_ENABLED, routes } from './urls.ts'

export interface SitePage {
  /** Path relative to the site root, with the base applied, e.g. "/reports/hot-dog/". */
  path: string
  /** ISO date of the data that last changed this page, when the page is data-driven. */
  lastmod?: string
  /** A crawler hint; "weekly" for pages that change with each edition. */
  changefreq: 'weekly' | 'monthly' | 'yearly'
  /** Relative importance, 0 to 1. The question pages are the point of the site. */
  priority: number
}

export function sitePages(): SitePage[] {
  const questions = getQuestions()
  const runs = getAllRuns()
  const latest = getLatestRun()
  const latestDate = latest?.finishedAt.slice(0, 10)
  const pages: SitePage[] = []
  const add = (path: string, page: Omit<SitePage, 'path'>) => pages.push({ path, ...page })

  add(routes.home(), { lastmod: latestDate, changefreq: 'weekly', priority: 1 })
  add(routes.reports(), { lastmod: latestDate, changefreq: 'weekly', priority: 0.9 })
  for (const question of questions) {
    add(routes.report(question.id), { lastmod: latestDate, changefreq: 'weekly', priority: 0.9 })
    if (latest) {
      for (const condition of treatedConditions(latest)) {
        const ran = latest.results.some(
          (cell) => cell.questionId === question.id && cell.conditionId === condition.id,
        )
        if (ran) {
          add(routes.reportCondition(question.id, condition.id), {
            lastmod: latestDate,
            changefreq: 'weekly',
            priority: 0.7,
          })
        }
      }
    }
    add(routes.historyForQuestion(question.id), {
      lastmod: latestDate,
      changefreq: 'weekly',
      priority: 0.6,
    })
  }
  add(routes.history(), { lastmod: latestDate, changefreq: 'weekly', priority: 0.5 })
  add(routes.runs(), { lastmod: latestDate, changefreq: 'weekly', priority: 0.5 })
  for (const run of runs) {
    const published = run.finishedAt.slice(0, 10)
    add(routes.run(run.isoWeek), { lastmod: published, changefreq: 'yearly', priority: 0.4 })
    for (const question of run.questions) {
      add(routes.runQuestion(run.isoWeek, question.id), {
        lastmod: published,
        changefreq: 'yearly',
        priority: 0.3,
      })
    }
  }
  add(routes.methodology(), { changefreq: 'monthly', priority: 0.6 })
  add(routes.howItWorks(), { changefreq: 'monthly', priority: 0.5 })
  add(routes.addAModel(), { changefreq: 'monthly', priority: 0.3 })
  add(routes.about(), { changefreq: 'monthly', priority: 0.4 })
  add(routes.accessibility(), { changefreq: 'yearly', priority: 0.2 })
  if (RUN_YOUR_OWN_ENABLED) add(routes.runYourOwn(), { changefreq: 'monthly', priority: 0.3 })
  return pages
}
