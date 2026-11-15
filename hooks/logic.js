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
const COMMIT = /\bgit\s+(-\S+\s+\S+\s+)*commit\b/
const TEST =
  /\b((npm|pnpm|yarn|bun)\s+(run\s+)?test|npx\s+(jest|vitest|playwright)|pytest|jest|vitest|cargo\s+test|go\s+test|dotnet\s+test|mvn\s+test|gradlew?(\.bat)?\s+\S*test|claude\s+plugin\s+test)\b/i

/** What a shell command means to the room: `merge`, `commit`, `test` or null. */
export function classify(command) {
  if (typeof command !== 'string') return null
  // Commit first: a commit message may mention a merge.
  if (COMMIT.test(command)) return 'commit'
  if (MERGE.test(command)) return 'merge'
  if (TEST.test(command)) return 'test'
  return null
}

/** About one day in five it rains, the same all day. */
export function isRainyDay(dayNumber) {
  return (Math.imul(dayNumber | 0, 2654435761) >>> 0) % 5 === 0
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

  return {
    project: facts.project ?? '',
    chat: facts.chat || undefined,
    branch: facts.project && facts.branch ? facts.branch : undefined,
    // Both belong to the branch: no branch line, neither.
    diff: facts.project && facts.branch ? facts.diff : undefined,
    pr: facts.project && facts.branch ? facts.pr : undefined,
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
