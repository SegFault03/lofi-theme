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
