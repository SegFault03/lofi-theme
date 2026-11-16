// Pure decisions: no engine, no clock of its own. Everything random takes `r`,
// a number in [0, 1), so a caller (or a test) decides the roll.

export const PHASES = ['dawn', 'day', 'golden', 'dusk', 'night']
export const MASCOT_POSES = [
  'phone',
  'window',
  'notice',
  'work',
  'scroll',
  'nap',
  'play',
  'sleep',
  'cheer',
  'facepalm',
]
export const KITTEN_POSES = [
  'loaf',
  'sill',
  'yarn',
  'desk',
  'prowl',
  'sleep',
  'startle',
  'pounce',
]

/** The lighting phase for a local hour, 0 to 24 (fractions allowed). */
export function phaseAt(hour) {
  if (hour < 5 || hour >= 20.5) return 'night'
  if (hour < 8) return 'dawn'
  if (hour < 16) return 'day'
  if (hour < 18.5) return 'golden'
  return 'dusk'
}

function pick(list, r) {
  return list[Math.min(list.length - 1, Math.floor(r * list.length))]
}

/**
 * What the mascot does when it is not working.
 * `mode` is `waiting` (a background process, a long command, a question to
 * the person, or the person's turn to type) or `idle` (nothing for a while).
 */
export function restPose(hour, mode, r) {
  if (mode === 'waiting') {
    // Lazing off: doomscrolling leads, as it does.
    return pick(['scroll', 'scroll', 'nap', 'play', 'window', 'phone'], r)
  }
  if (hour < 5 || hour >= 21.5) return 'sleep'
  if (hour < 11) return pick(['phone', 'window', 'phone', 'play'], r)
  if (hour < 13) return pick(['phone', 'play', 'window'], r)
  if (hour < 17) return pick(['nap', 'nap', 'scroll', 'window'], r)
  return pick(['window', 'scroll', 'play', 'window'], r)
}

/** What the kitten does by itself. */
export function kittenPose(phase, r) {
  if (phase === 'night') {
    // Mostly asleep, with the occasional 3am zoomies.
    return pick(['sleep', 'sleep', 'sleep', 'loaf', 'prowl', 'sill'], r)
  }
  if (phase === 'dawn') return pick(['sill', 'prowl', 'yarn', 'sleep'], r)
  return pick(['sill', 'loaf', 'yarn', 'prowl', 'sleep', 'loaf'], r)
}

const MERGE = /\bgh\s+pr\s+merge\b/
const OPENED = /\bgh\s+pr\s+create\b/
const COMMIT = /\bgit\s+(-\S+\s+\S+\s+)*commit\b/
const TEST =
  /\b((npm|pnpm|yarn|bun)\s+(run\s+)?test|npx\s+(jest|vitest|playwright)|pytest|jest|vitest|cargo\s+test|go\s+test|dotnet\s+test|mvn\s+test|gradlew?(\.bat)?\s+\S*test|claude\s+plugin\s+test)\b/i

/** What a shell command means to the room: `merge`, `commit`, `pr` (one opened), `test` or null. */
export function classify(command) {
  if (typeof command !== 'string') return null
  // Commit first: a commit message may mention a merge.
  if (COMMIT.test(command)) return 'commit'
  if (MERGE.test(command)) return 'merge'
  if (OPENED.test(command)) return 'pr'
  if (TEST.test(command)) return 'test'
  return null
}

const READS = ['Read', 'Grep', 'Glob', 'LS', 'NotebookRead', 'ToolSearch']
const EDITS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']
const SHELLS = ['Bash', 'PowerShell']
const short = (text, most = 28) => {
  const all = [...String(text ?? '').replace(/\s+/g, ' ').trim()]

  return all.length > most ? all.slice(0, most - 1).join('') + '…' : all.join('')
}

/**
 * What a tool call is, for the desk: one of `read`, `edit`, `shell`, `web`,
 * and a few words for the ticker. Only a file's own name and a command's
 * first word are shown, never a path or an argument. Undefined for a tool
 * that is none of these.
 */
export function activityOf(tool, input = {}) {
  const name = String(tool ?? '')
  const file = folderName(input?.file_path ?? input?.notebook_path ?? input?.path)

  if (EDITS.includes(name)) return { kind: 'edit', label: short(file ? `editing ${file}` : 'editing') }
  if (READS.includes(name)) {
    return { kind: 'read', label: short(name === 'Read' && file ? `reading ${file}` : name === 'Read' ? 'reading' : 'searching') }
  }
  if (SHELLS.includes(name)) {
    const word = folderName(String(input?.command ?? '').trim().split(/\s+/)[0]).replace(/[^\w.-]/g, '')

    return { kind: 'shell', label: short(word ? `running ${word}` : 'running a command') }
  }
  if (/^Web(Fetch|Search)$|browser|chrome|computer/i.test(name)) {
    return { kind: 'web', label: name === 'WebSearch' ? 'searching the web' : 'browsing' }
  }

  return undefined
}

/** About one day in five it rains, the same all day. */
export function isRainyDay(dayNumber) {
  return (Math.imul(dayNumber | 0, 2654435761) >>> 0) % 5 === 0
}

// ---------------------------------------------------------------- the tasks

const MARK = { pending: 'p', in_progress: 'a', completed: 'd' }

/** The most notes the shelf has room for. */
export const MOST_NOTES = 8

/**
 * The task list after a tool call, or the same list where the call is not
 * about tasks. Each task is `{ id?, mark }`: `p` pending, `a` in hand, `d`
 * done. No task's words are kept. `result` is the call's own answer, which
 * holds a new task's id.
 */
export function tasksAfter(tasks, tool, input = {}, result = undefined) {
  const name = String(tool ?? '')
  const whole = list => (Array.isArray(list) ? list.map(each => ({ mark: MARK[each?.status] ?? 'p' })) : tasks)

  if (name === 'TodoWrite') return whole(input?.todos)
  if (name === 'TaskCreate') {
    const id = result?.task?.id

    return [...tasks, { id: id === undefined ? undefined : String(id), mark: 'p' }]
  }
  if (name === 'TaskUpdate') {
    const id = String(input?.taskId ?? '')

    if (input?.status === 'deleted') return tasks.filter(each => each.id !== id)
    const mark = MARK[input?.status]

    return mark === undefined ? tasks : tasks.map(each => (each.id === id ? { ...each, mark } : each))
  }
  // The desktop app's own list: a whole plan, or a step forward in it.
  if (/update_plan$/.test(name)) {
    if (Array.isArray(input?.items)) return whole(input.items)
    let next = tasks.map(each => ({ ...each }))

    if (input?.advance === true) {
      const at = next.findIndex(each => each.mark === 'a')

      if (at >= 0) next[at].mark = 'd'
      const then = next.findIndex(each => each.mark === 'p')

      if (then >= 0) next[then].mark = 'a'
    }
    for (const step of Array.isArray(input?.done) ? input.done : []) {
      if (next[step - 1]) next[step - 1].mark = 'd'
    }
    if (next[input?.start - 1]) next[input.start - 1].mark = 'a'

    return next
  }
  // Wrapping a turn up checks the rest of the list off.
  if (/__wrap_up$/.test(name)) return tasks.map(each => ({ ...each, mark: 'd' }))

  return tasks
}

/**
 * The list as the shelf's notes: one letter a task, MOST_NOTES at most,
 * the stretch that holds the one in hand. Undefined for no list.
 */
export function notesOf(tasks) {
  if (tasks.length === 0) return undefined
  const marks = tasks.map(each => each.mark).join('')
  const hand = Math.max(0, marks.indexOf('a') < 0 ? marks.indexOf('p') : marks.indexOf('a'))
  const from = Math.max(0, Math.min(hand - 3, marks.length - MOST_NOTES))

  return marks.slice(from, from + MOST_NOTES)
}

/** How much coffee is left in the mug, 4 (full) to 0, as the context fills. */
export function cupOf(percent) {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return undefined

  return 4 - Math.max(0, Math.min(4, Math.floor(percent / 20)))
}

// ---------------------------------------------------------------- the TV

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const two = value => String(value).padStart(2, '0')
const clockTime = at => `${two(at.getHours())}:${two(at.getMinutes())}`

/** The last part of a path: a folder's name, for a session outside a repository. */
export function folderName(path) {
  return (
    String(path ?? '')
      .split(/[\\/]/)
      .filter(Boolean)
      .pop() ?? ''
  )
}

/**
 * When a quota window resets, short: the time alone when it is within the
 * day, the weekday before it otherwise. Undefined for no reading.
 */
export function resetLabel(iso, now = new Date()) {
  const at = new Date(iso ?? NaN)

  if (Number.isNaN(at.getTime())) return undefined

  return at.getTime() - now.getTime() < 20 * 3_600_000 ? clockTime(at) : `${DAYS[at.getDay()]} ${clockTime(at)}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The date under the clock: `SUN 15 NOV`. */
export function dateLabel(now = new Date()) {
  return `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`.toUpperCase()
}

/** A greeting for the hour, with the person's name when there is one. */
export function greeting(hour, name) {
  const words =
    hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 17 ? 'Good afternoon' : hour >= 17 && hour < 22 ? 'Good evening' : 'Good night'
  const who = String(name ?? '').trim()

  return who === '' ? words : `${words}, ${who[0].toUpperCase()}${who.slice(1)}`
}

/**
 * What `git diff --shortstat` says, as lines added and removed. Undefined
 * for a clean tree or text that is not a stat.
 */
export function diffStat(text) {
  const added = Number(/(\d+) insertion/.exec(String(text ?? ''))?.[1] ?? 0)
  const removed = Number(/(\d+) deletion/.exec(String(text ?? ''))?.[1] ?? 0)

  return added + removed > 0 ? { added, removed } : undefined
}

export const PR_STATES = ['draft', 'open', 'pending', 'failing', 'passing', 'changes', 'merged', 'closed']

const FAILED = ['FAILURE', 'ERROR', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE']

/**
 * The one word for a pull request, from what
 * `gh pr view --json state,isDraft,reviewDecision,statusCheckRollup` prints.
 * The worst news wins: failing checks, then changes asked for, then checks
 * still running. Undefined for anything that is not such a reading.
 */
export function prState(json) {
  let pr

  try {
    pr = JSON.parse(String(json ?? ''))
  } catch {
    return undefined
  }
  if (pr === null || typeof pr !== 'object') return undefined
  if (pr.state === 'MERGED') return 'merged'
  if (pr.state === 'CLOSED') return 'closed'
  if (pr.state !== 'OPEN') return undefined
  const checks = Array.isArray(pr.statusCheckRollup) ? pr.statusCheckRollup : []
  // A check run has a status and a conclusion; a commit status, a state.
  const word = check => String(check?.conclusion || check?.state || check?.status || '')

  if (checks.some(check => FAILED.includes(word(check)))) return 'failing'
  if (pr.reviewDecision === 'CHANGES_REQUESTED') return 'changes'
  if (checks.some(check => !['SUCCESS', 'NEUTRAL', 'SKIPPED'].includes(word(check)))) return 'pending'
  if (pr.isDraft === true) return 'draft'

  return checks.length > 0 ? 'passing' : 'open'
}

/** How long a merged request keeps its card: a day from the merge. */
export const MERGED_SHOWN_MS = 24 * 3_600_000

/**
 * The pull request as the TV needs it, from what
 * `gh pr view --json number,mergedAt,state,...` prints: its word, its number
 * and when it was merged (ms), each where the reading has one.
 */
export function prFacts(json) {
  const state = prState(json)

  if (state === undefined) return undefined
  const pr = JSON.parse(String(json))
  const mergedAt = new Date(pr.mergedAt ?? NaN).getTime()

  return {
    state,
    number: Number.isInteger(pr.number) && pr.number > 0 ? pr.number : undefined,
    mergedAt: Number.isNaN(mergedAt) ? undefined : mergedAt,
  }
}

/**
 * What the TV shows, from the session's facts. Every figure is rounded, so
 * the screen (and with it the whole scene) is redrawn only when one moves by
 * something a person would see.
 */
export function screenOf(facts, now = new Date()) {
  const quota = kind => {
    const limit = (facts.rateLimits ?? []).find(each => each.kind === kind)

    return limit === undefined
      ? undefined
      : { percent: Math.round(limit.percentUsed), resets: resetLabel(limit.resetsAt, now) }
  }
  const context = facts.context
  const feed = []

  if (facts.turns > 0) feed.push(`turn ${facts.turns}`)
  if (facts.cost !== undefined) feed.push(`$${facts.cost.usd.toFixed(2)}`)
  if (facts.startedAt !== undefined) feed.push(`since ${clockTime(new Date(facts.startedAt))}`)
  // A word of warning for whatever is past four fifths, where the TV turns red.
  if (quota('five_hour')?.percent > 80) feed.push('Low on 5h usage!')
  if (quota('seven_day')?.percent > 80) feed.push('Low on weekly usage!')
  if (Math.round(context?.percent ?? 0) > 80) feed.push('Context limit reaching soon!')
  // A merged request is old news after a day: its card goes by itself.
  const isOldMerge =
    facts.pr === 'merged' && facts.prMergedAt !== undefined && now.getTime() - facts.prMergedAt > MERGED_SHOWN_MS
  const hasPr = Boolean(facts.project && facts.branch && facts.pr) && !isOldMerge

  return {
    project: facts.project ?? '',
    chat: facts.chat || undefined,
    branch: facts.project && facts.branch ? facts.branch : undefined,
    // Both belong to the branch: no branch line, neither.
    diff: facts.project && facts.branch ? facts.diff : undefined,
    pr: hasPr ? facts.pr : undefined,
    prNumber: hasPr ? facts.prNumber : undefined,
    // Shown in place of a name that is not known yet.
    greeting: facts.project && facts.chat ? undefined : greeting(now.getHours(), facts.user),
    fiveHour: quota('five_hour'),
    week: quota('seven_day'),
    context:
      context === undefined
        ? undefined
        : {
            window: context.window,
            tokens: context.tokens === undefined ? undefined : Math.round(context.tokens / 1000) * 1000,
            percent: context.percent === undefined ? undefined : Math.round(context.percent),
          },
    feed,
  }
}
