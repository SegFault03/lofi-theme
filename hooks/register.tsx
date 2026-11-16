import { atom, read, update } from 'claude-code'
import type { EngineInterface, PluginOptions, Register, Timer } from 'claude-code'

import type { Doing, Fx, KittenPose, MascotPose, Phase, Room, Screen, Wall } from '../types'
import {
  classify,
  cupOf,
  dateLabel,
  diffStat,
  folderName,
  prFacts,
  activityOf,
  bloomAt,
  isFeedingTime,
  isWateringTime,
  localDay,
  isRainyDay,
  KITTEN_POSES,
  kittenPose,
  notesOf,
  MASCOT_POSES,
  PHASES,
  phaseAt,
  restPose,
  screenOf,
  tasksAfter,
} from './logic.js'
import type { ScreenFacts, Task } from './logic.js'
import { buildScene, WALLS } from './scene.js'

const PLUGIN = 'lofi-theme'
const SCENE = 'living-room'
const INITIAL: Room = {
  phase: 'day',
  mascot: 'phone',
  kitten: 'loaf',
  fx: 'none',
  isRaining: false,
  isWaiting: false,
  isPinned: false,
}
// Change the tag when Room's fields change: it declines what older code stored.
const room = atom({ plugin: 'lofi-theme', key: 'room' } as const, INITIAL, {
  shape: 'room-7',
})
// Bumped to have the scene drawn again with the time as it is now: the clock's
// digits run on the scene's own CSS, which a sleeping machine leaves behind.
const resync = atom({ plugin: 'lofi-theme', key: 'resync' } as const, 0)
// What the wall TV shows. Change the tag when Screen's fields change.
const BLANK: Screen = { project: '', feed: [] }
const tv = atom({ plugin: 'lofi-theme', key: 'tv' } as const, BLANK, {
  shape: 'tv-3',
})

// What the person chose in the plugin's options (plugin.json's `userConfig`).
// A change there reloads this module, so they hold for the module's life.
type Options = {
  clock: '24h' | '12h'
  timeOfDay: 'auto' | Phase
  wall: Wall
  hasKitten: boolean
  hasCelebrations: boolean
  hasRain: boolean
  hasTv: boolean
}
const DEFAULTS: Options = {
  clock: '24h',
  timeOfDay: 'auto',
  wall: 'slate',
  hasKitten: true,
  hasCelebrations: true,
  hasRain: true,
  hasTv: true,
}
let O: Options = DEFAULTS

// The engine has already checked each value against the manifest; anything
// this build does not know (an older settings file) falls back to the default.
function readOptions(options: PluginOptions): Options {
  const timeOfDay = String(options.timeOfDay)
  const wall = String(options.wall)

  return {
    clock: options.clockFormat === '12h' ? '12h' : '24h',
    timeOfDay: (PHASES as readonly string[]).includes(timeOfDay) ? (timeOfDay as Phase) : 'auto',
    wall: Object.keys(WALLS).includes(wall) ? (wall as Wall) : 'slate',
    hasKitten: options.kitten !== false,
    hasCelebrations: options.celebrations !== false,
    hasRain: options.rain !== false,
    hasTv: options.tv !== false,
  }
}

const SLOW_MS = 20_000 // a tool call this long is "waiting on a process"
const NOTICE_MS = 7_000 // how long the mascot stays perked up after a key
const DOING_MS = 1_500 // the desk shows another tool no sooner than this
const LINGER_MS = 4_000 // and keeps a finished one's look this long
const AGENT_MS = 15 * 60_000 // a subagent not heard of this long is taken to be gone
const MOST_HELPERS = 3 // the floor by the desk has room for this many
const IDLE_MS = 10 * 60_000 // quiet this long and the mascot follows the clock
const TICK_MS = 60_000
const FEED_SHOWN_MS = 14_000 // how long a meal is on show
const WATER_SHOWN_MS = 11_000 // and a watering
const HELP = [
  'Usage: /room <what>',
  `  time of day: ${PHASES.join(', ')}`,
  `  mascot: ${MASCOT_POSES.join(', ')}`,
  `  kitten: ${KITTEN_POSES.map(pose => `kitten-${pose}`).join(', ')}`,
  '  extras: fireworks, confetti, rain, clear',
  '  care: feed (the kitten), water (the plant), each by itself',
  '  auto: let the session drive the room again',
  '  log: the last redraws of the scene, and when',
].join('\n')

// `isCare`: a chore, not news of the session; a turn that starts cuts it short.
type Shown = { mascot: MascotPose; fx: Fx; kitten?: KittenPose; news?: string; isCare?: boolean }

// What the session is doing. Module state starts over on a reload, which is
// right for it: a reload lands between turns. What is drawn lives in $.state.
const S = {
  isInTurn: false,
  hasBackgroundWork: false,
  slowCalls: 0,
  questions: 0,
  isNoticing: false,
  lastKeyAt: 0,
  // 0: a fresh session is idle, so the mascot follows the clock at once.
  lastActiveAt: 0,
  noticeTimer: undefined as Timer | undefined,
  showTimer: undefined as Timer | undefined,
  show: undefined as Shown | undefined,
  rest: 'phone' as MascotPose,
  pet: 'loaf' as KittenPose,
  ticks: 0,
  lastTickAt: 0,
  day: '',
  tick: undefined as Timer | undefined,
  // The tool in hand as the desk shows it, the one waiting to be shown, and
  // when the desk last changed.
  doing: undefined as Doing | undefined,
  nextDoing: undefined as Doing | undefined,
  doingAt: 0,
  isBrief: false,
  doingTimer: undefined as Timer | undefined,
  // The subagents at work, each with when it was last heard of: one whose
  // end never comes is let go after AGENT_MS.
  agents: new Map<string, number>(),
  // The session's task list, as the tool calls that write it have left it.
  tasks: [] as Task[],
  // When the kitten was last fed and the plant last watered (ms), as the
  // store has them: they hold across sessions.
  fedAt: undefined as number | undefined,
  wateredAt: undefined as number | undefined,
}

// What the session has told us for the TV. It starts over on a reload; the
// screen itself lives in $.state, and `session.start` takes the chat's name
// back from there.
const F: ScreenFacts = {}
let hasHeardTitle = false

function hourNow(): number {
  const now = new Date()

  return now.getHours() + now.getMinutes() / 60
}

function isWaiting(): boolean {
  return S.slowCalls > 0 || S.questions > 0 || (!S.isInTurn && S.hasBackgroundWork)
}

function restMode(): 'waiting' | 'idle' {
  return S.isInTurn || S.hasBackgroundWork || Date.now() - S.lastActiveAt < IDLE_MS
    ? 'waiting'
    : 'idle'
}

function rollRest(): void {
  S.rest = restPose(hourNow(), restMode(), Math.random())
}

function rollPet(): void {
  S.pet = kittenPose(phaseAt(hourNow()), Math.random())
}

// The room as the session's state says it should be now.
function wanted(): Omit<Room, 'isPinned'> {
  const phase: Phase = O.timeOfDay === 'auto' ? phaseAt(hourNow()) : O.timeOfDay
  const isRaining = O.hasRain && isRainyDay(Math.floor(Date.now() / 86_400_000))
  let mascot: MascotPose
  let fx: Fx = 'none'
  let kitten = S.pet

  if (S.show !== undefined) {
    mascot = S.show.mascot
    fx = S.show.fx
    kitten = S.show.kitten ?? S.pet
  } else if (S.isInTurn) {
    mascot = S.slowCalls > 0 || S.questions > 0 ? S.rest : 'work'
  } else if (S.isNoticing) {
    mascot = 'notice'
  } else {
    mascot = S.rest
  }
  // Playing takes two: with no kitten the mascot scrolls instead.
  if (mascot === 'play' && !O.hasKitten) mascot = 'scroll'
  if (mascot === 'play') kitten = 'pounce'

  const room: Omit<Room, 'isPinned'> = { phase, mascot, kitten, fx, isRaining, isWaiting: isWaiting() }

  // The tool in hand shows only while the mascot is at the keyboard.
  // With none in a turn, it is thinking, or writing its answer.
  if (mascot === 'work') room.doing = S.doing ?? (S.isInTurn ? { kind: 'think', label: 'thinking' } : undefined)
  if (room.doing === undefined) delete room.doing
  if (S.show?.news !== undefined) room.news = S.show.news
  // A small helper by the desk for each subagent at work.
  if (S.agents.size > 0) room.helpers = Math.min(MOST_HELPERS, S.agents.size)
  // The task list as the notes under the shelf; the context as the mug's coffee.
  const notes = notesOf(S.tasks)
  const cup = cupOf(F.context?.percent)

  if (notes !== undefined) room.notes = notes
  if (cup !== undefined) room.cup = cup
  // The plant's week of flowers goes by the calendar.
  const bloom = bloomAt(localDay(Date.now()))

  if (bloom !== 'none') room.bloom = bloom

  return room
}

// Says what tool is in hand, or with nothing that the call is over. Tools
// come several a second and every change is a redraw, so the desk changes at
// most once in DOING_MS, to the latest; and it keeps a finished call's look
// for LINGER_MS, in case the next call follows.
function note($: EngineInterface, doing?: Doing, isBrief = false): void {
  S.nextDoing = doing
  S.isBrief = isBrief
  S.doingTimer?.cancel()
  const show = () => {
    S.doingTimer = undefined
    if (S.nextDoing?.kind !== S.doing?.kind || S.nextDoing?.label !== S.doing?.label) {
      S.doing = S.nextDoing
      S.doingAt = Date.now()
      void sync($).catch(() => undefined)
    }
    // A brief one (a call that failed) has no call to end it: it goes by itself.
    if (S.isBrief) {
      S.isBrief = false
      S.nextDoing = undefined
      S.doingTimer = $.clock.after(LINGER_MS, show)
    }
  }
  const wait = Math.max(doing === undefined ? LINGER_MS : 0, DOING_MS - (Date.now() - S.doingAt))

  if (wait <= 0) show()
  else S.doingTimer = $.clock.after(wait, show)
}

// A key in the prompt box between turns: the mascot looks up, and settles
// NOTICE_MS after the last one.
async function perk($: EngineInterface): Promise<void> {
  if (S.isInTurn) return
  S.lastKeyAt = Date.now()
  S.lastActiveAt = S.lastKeyAt
  if (S.isNoticing) return
  S.isNoticing = true
  const settle = () => {
    const left = NOTICE_MS - (Date.now() - S.lastKeyAt)

    if (left > 200) {
      S.noticeTimer = $.clock.after(left, settle)

      return
    }
    S.isNoticing = false
    void sync($)
  }

  S.noticeTimer = $.clock.after(NOTICE_MS, settle)
  await sync($)
}

// Sets the backdrop. The chat keeps the app's own panels and frosting: the
// room is drawn at the two sides, where nothing sits over it.
async function dress($: EngineInterface): Promise<void> {
  const set = await $.theme.set({
    backdrop: { scene: SCENE },
  })

  // A theme that was set stands for the session: with no client attached yet
  // (as at a reload) it is drawn when one attaches, so that is not worth a
  // line under the prompt. Only a theme that does not stand is.
  $.ui.status(set.isDrawn || set.requestId !== undefined ? undefined : `${PLUGIN}: ${set.reason}`)
}

// Every write to the state is a redraw of the whole scene, which the person
// may see as a flicker (in the chat too, which is glass over the scene). The
// last of them are kept for `/room log`, to set beside what was seen.
const LOG: { at: number; what: string }[] = []

function logged(what: string): void {
  LOG.push({ at: Date.now(), what })
  if (LOG.length > 40) LOG.shift()
}

// One at a time. Two that ran together would each read the old state and
// each write the new one: the same scene drawn twice.
let roomQueue: Promise<void> = Promise.resolve()
let tvQueue: Promise<void> = Promise.resolve()

function sync($: EngineInterface): Promise<void> {
  const run = roomQueue.then(() => syncNow($))

  roomQueue = run.catch(() => undefined)

  return run
}

function air($: EngineInterface): Promise<void> {
  const run = tvQueue.then(() => airNow($))

  tvQueue = run.catch(() => undefined)

  return run
}

async function syncNow($: EngineInterface): Promise<void> {
  const current = await read($, room)

  if (current.isPinned) return
  const { was, at, ...shown } = current
  const next: Room = { ...wanted(), isPinned: false }

  // Every write redraws the scene and restarts its animations, so only a
  // real change is written.
  if (JSON.stringify(next) !== JSON.stringify(shown)) {
    await update($, room, () => moved(current, next))
    logged(`room: ${next.mascot}, kitten ${next.kitten}${next.doing ? `, ${next.doing.kind}` : ''}${next.fx !== 'none' ? `, ${next.fx}` : ''}${next.isWaiting ? ', waiting' : ''}`)
  }
}

// The room to store: with a change of pose it carries the poses it leaves
// and the time, so the scene can draw the move; without one, what it had.
function moved(current: Room, next: Room): Room {
  if (next.mascot !== current.mascot || next.kitten !== current.kitten) {
    return { ...next, was: { mascot: current.mascot, kitten: current.kitten }, at: Date.now() }
  }

  return current.was === undefined ? next : { ...next, was: current.was, at: current.at }
}

// Puts the session's figures on the TV. Each is asked for by itself: one the
// engine cannot answer leaves the others on the screen.
async function airNow($: EngineInterface): Promise<void> {
  if (!O.hasTv) return
  const current = await read($, tv)

  // The names are not always there at the start (a reload starts the facts
  // over, and may not raise `session.start`), so each airing asks again for
  // one that is missing, and failing that keeps what the screen shows.
  if (!F.project) {
    const repo = await $.session.repo().catch(() => null)
    const folder = repo?.root ?? (await $.session.cwd().catch(() => undefined))

    F.project = folderName(folder) || current.project
  }
  if (!hasHeardTitle && !F.chat) F.chat = current.chat
  // The login name, for the greeting that stands in for a missing name.
  if (F.user === undefined) {
    F.user =
      (await $.env.get('USERNAME').catch(() => undefined)) ?? (await $.env.get('USER').catch(() => undefined)) ?? ''
  }
  F.turns = await $.session.turns().catch(() => F.turns)
  const next = screenOf(F)

  // As with the room: a write redraws the scene, so only a real change.
  if (JSON.stringify(next) !== JSON.stringify(current)) {
    await update($, tv, () => next)
    // Which of the TV's lines moved, by name only.
    const keys = Object.keys({ ...next, ...current }) as (keyof Screen)[]

    logged(`tv: ${keys.filter(key => JSON.stringify(next[key]) !== JSON.stringify(current[key])).join(', ')}`)
  }
}

// Reads the checked-out branch. Git says nothing outside a repository, or
// with a detached head, and then the TV shows no branch.
async function scout($: EngineInterface): Promise<void> {
  if (!O.hasTv) return
  // The folder too: the app may start a session in a spare folder and move
  // it to the project afterwards, so the first answer is not kept for good.
  const repo = await $.session.repo().catch(() => null)
  const folder = folderName(repo?.root ?? (await $.session.cwd().catch(() => undefined)))

  if (folder) F.project = folder
  const ran = await $.process.run(['git', 'branch', '--show-current'], { timeoutMs: 3000 }).catch(() => undefined)
  const branch = ran?.exitCode === 0 ? ran.stdout.trim() || undefined : undefined

  // Another branch has another pull request: the old one's mark goes at once.
  if (branch !== F.branch) F.pr = F.prNumber = F.prMergedAt = undefined
  F.branch = branch
  if (branch === undefined) {
    F.diff = undefined

    return
  }
  // What is not committed yet, staged or not. A repository with no commit
  // has no HEAD to compare with, and then there is no figure.
  const stat = await $.process.run(['git', 'diff', '--shortstat', 'HEAD'], { timeoutMs: 3000 }).catch(() => undefined)

  F.diff = stat?.exitCode === 0 ? diffStat(stat.stdout) : undefined
}

// Asks GitHub's own tool for the branch's pull request. It goes over the
// network, so no hook waits for it: `survey` is started and left to air the
// screen when it is back. Without `gh` it is not tried again.
let hasGh = true

async function survey($: EngineInterface): Promise<void> {
  if (!O.hasTv || !hasGh || F.branch === undefined) return
  const branch = F.branch
  const ran = await $.process
    .run(['gh', 'pr', 'view', '--json', 'number,mergedAt,state,isDraft,reviewDecision,statusCheckRollup'], { timeoutMs: 10_000 })
    .catch(() => {
      hasGh = false

      return undefined
    })

  // The branch may have changed while GitHub answered.
  if (branch !== F.branch) return
  // No pull request, or not signed in: no mark.
  const pull = ran?.exitCode === 0 ? prFacts(ran.stdout) : undefined

  F.pr = pull?.state
  F.prNumber = pull?.number
  F.prMergedAt = pull?.mergedAt
  await air($)
}

// Asks the engine for the figures as they are now, where no measurement
// has brought them: at the start, and after /clear or a compaction.
async function gauge($: EngineInterface): Promise<void> {
  const usage = await $.session.usage().catch(() => undefined)

  if (usage !== undefined) {
    F.startedAt = usage.startedAt
    F.context = usage.context
    F.rateLimits = usage.rateLimits
    F.cost = usage.cost
  }
}

// The facts that hold for the whole session, and the first figures.
async function tune($: EngineInterface, cwd: string): Promise<void> {
  if (!O.hasTv) return
  const repo = await $.session.repo().catch(() => null)

  // Empty is left for `air` to ask about again.
  F.project = folderName(repo?.root ?? cwd) || undefined
  await scout($)
  await air($)
  void survey($).catch(() => undefined)
}

// A moment that passes by itself: a cheer, a facepalm, the fireworks.
function flash($: EngineInterface, shown: Shown, ms: number): Promise<void> {
  if (!O.hasCelebrations && shown.isCare !== true) return sync($)
  S.showTimer?.cancel()
  S.show = shown
  S.showTimer = $.clock.after(ms, () => {
    S.show = undefined
    void sync($)
  })

  return sync($)
}

// Feeds the kitten or waters the plant: notes when, for this session and
// the next, and shows it for a while.
async function tend($: EngineInterface, chore: 'feed' | 'water'): Promise<void> {
  const now = Date.now()

  if (chore === 'feed') {
    S.fedAt = now
    void $.store.set('fedAt', now).catch(() => undefined)
    await flash($, { mascot: 'feed', fx: 'none', kitten: 'eat', news: 'Feeding the kitten', isCare: true }, FEED_SHOWN_MS)
  } else {
    S.wateredAt = now
    void $.store.set('wateredAt', now).catch(() => undefined)
    await flash($, { mascot: 'water', fx: 'none', news: 'Watering the plant', isCare: true }, WATER_SHOWN_MS)
  }
}

// The chores, looked at once a minute and done in a quiet moment: the plant
// once a day while it is light, the kitten when it has not eaten today or
// for two hours. Never in a turn, over another moment, asleep, or in a room
// the person has posed.
async function care($: EngineInterface): Promise<void> {
  if (S.isInTurn || S.show !== undefined || S.isNoticing || S.rest === 'sleep') return
  if ((await read($, room)).isPinned) return
  const now = Date.now()

  if (isWateringTime(now, S.wateredAt)) await tend($, 'water')
  else if (O.hasKitten && isFeedingTime(now, S.fedAt)) await tend($, 'feed')
}

export const register: Register = (on, options) => {
  O = readOptions(options)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'room',
      description: 'Pose the living room backdrop, or hand it back with "auto"',
      argumentHint: '[auto | night | nap | kitten-yarn | fireworks | ...]',
      immediate: true,
    })
    // A refused backdrop must not stop the rest of the setup.
    await dress($).catch(() => undefined)
    // The mug wants the context's fill, with or without the TV.
    await gauge($).catch(() => undefined)
    // When the chores were last done, in an earlier session perhaps.
    const fedAt = await $.store.get('fedAt').catch(() => undefined)
    const wateredAt = await $.store.get('wateredAt').catch(() => undefined)

    if (typeof fedAt === 'number') S.fedAt = fedAt
    if (typeof wateredAt === 'number') S.wateredAt = wateredAt
    rollRest()
    rollPet()
    await sync($)
    await tune($, e.cwd).catch(() => undefined)

    // Once a minute: follow the clock, and now and then let the two of them
    // find something else to do.
    S.lastTickAt = Date.now()
    S.day = dateLabel()
    // One tick, however often the session is said to start.
    S.tick?.cancel()
    S.tick = $.clock.every(TICK_MS, () => {
      const now = Date.now()
      const day = dateLabel()

      // The date under the clock is plain text: a new day draws it again.
      if (day !== S.day) {
        S.day = day
        void update($, resync, count => count + 1).catch(() => undefined)
      }

      // A tick that comes late means the machine slept, and the scene's own
      // clock with it: draw the scene again so the digits tell the time.
      if (now - S.lastTickAt > TICK_MS * 1.5) {
        void update($, resync, count => count + 1).catch(() => undefined)
      }
      S.lastTickAt = now
      S.ticks += 1
      for (const [id, seenAt] of S.agents) if (now - seenAt > AGENT_MS) S.agents.delete(id)
      if (S.ticks % 3 === 0) rollPet()
      if (S.ticks % 4 === 0 && !S.isInTurn) rollRest()
      // Asleep at night once things have gone quiet; awake again by morning.
      if (!S.isInTurn && restMode() === 'idle') {
        const idle = restPose(hourNow(), 'idle', Math.random())

        if ((idle === 'sleep') !== (S.rest === 'sleep')) S.rest = idle
      }
      void sync($)
      void care($).catch(() => undefined)
      // Nothing is polled: the figures come by `session.measure`, the branch
      // with prompts and git commands. Only a project's name that is still
      // missing is asked for again, until it is there. A merged request is
      // aired too, so its card goes when its day is over.
      if (O.hasTv && (!F.project || F.pr === 'merged')) void air($).catch(() => undefined)
    })

    return next(e)
  })

  // The engine's own measurement, after each turn and when a quota window
  // moves a whole point.
  on('session.measure', async ($, e, next) => {
    try {
      F.context = e.context
      F.rateLimits = e.rateLimits
      F.cost = e.cost
      await air($)
      // The mug's level: a write only when it crosses a fifth.
      await sync($)
    } catch {
      // Display only.
    }

    return next(e)
  })

  // The chat's name is told only here and with each prompt, so a rename
  // reaches the TV at the next prompt. This also runs on /clear and after a
  // compaction, where `session.start` does not: the figures are read again.
  on('classic.SessionStart', async ($, e, next) => {
    try {
      // No name with a /clear is a new chat; with anything else, the same one,
      // whose name the screen still holds (after a reload, only the screen).
      if (e.session_title !== undefined || e.source === 'clear') {
        hasHeardTitle = true
        F.chat = e.session_title
      }
      // A cleared chat has no list.
      if (e.source === 'clear') S.tasks = []
      await gauge($)
      await air($)
      await sync($)
    } catch {
      // Display only.
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.UserPromptSubmit', async ($, e, next) => {
    try {
      if (e.session_title !== undefined && e.session_title !== F.chat) {
        hasHeardTitle = true
        F.chat = e.session_title
      }
      // The branch, and what is not committed, may have been changed outside
      // the session since the last turn.
      await scout($)
      await air($)
      void survey($).catch(() => undefined)
    } catch {
      // Display only.
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // The session moved to another folder: its name, branch and pull request.
  on('classic.CwdChanged', async ($, e, next) => {
    try {
      await scout($)
      await air($)
      void survey($).catch(() => undefined)
    } catch {
      // Display only.
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.change', async ($, e, next) => {
    try {
      const isTyping = e.text.trim() !== '' && e.origin.kind !== 'plugin'

      if (isTyping) await perk($)
    } catch {
      // The backdrop never gets in the way of typing.
    }

    return next(e)
  })

  // Typing itself comes here: `prompt.change` is only for what no edit
  // carried (a recalled entry, a clear). A bare cursor move is not typing.
  // This hook stands in the way of every key: it starts the look and does
  // not wait for it, so the box is never held for a redraw.
  on('prompt.edit', ($, e, next) => {
    if (!S.isInTurn && (e.inputText !== '' || e.end > e.start)) void perk($).catch(() => undefined)

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      try {
        S.isInTurn = true
        S.slowCalls = 0
        S.questions = 0
        S.isNoticing = false
        S.noticeTimer?.cancel()
        S.hasBackgroundWork = false
        S.lastActiveAt = Date.now()
        // Work comes first: a chore on show is cut short.
        if (S.show?.isCare === true) {
          S.showTimer?.cancel()
          S.show = undefined
        }
        // A list all done has had its turn on the shelf.
        if (S.tasks.every(each => each.mark === 'd')) S.tasks = []
        // The kitten likes a warm desk.
        if (Math.random() < 0.5) S.pet = 'desk'
        await sync($)
      } catch {
        // Display only.
      }
    } else {
      // A subagent sets to work: a helper sits down by the desk.
      S.agents.set(e.agentId, Date.now())
      void sync($).catch(() => undefined)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      try {
        S.isInTurn = false
        S.doingTimer?.cancel()
        S.doing = S.nextDoing = undefined
        S.slowCalls = 0
        S.questions = 0
        S.lastActiveAt = Date.now()
        if (S.pet === 'desk') rollPet()
        // Now it's the person's move: time to laze.
        rollRest()
        await sync($)
        // The turn's edits are in: count them once, here, not at each edit.
        await scout($)
        await air($)
        void survey($).catch(() => undefined)
      } catch {
        // Display only.
      }
    } else {
      S.agents.delete(e.agentId)
      void sync($).catch(() => undefined)
    }

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const isQuestion = e.tool === 'AskUserQuestion'
    let isSlow = false
    let slowTimer: Timer | undefined

    try {
      // A subagent's call says it is still there.
      if (e.agentId !== undefined && S.agents.has(e.agentId)) S.agents.set(e.agentId, Date.now())
      const doing = S.isInTurn ? activityOf(e.tool, e) : undefined

      if (doing !== undefined) note($, doing)
      if (isQuestion) {
        S.questions += 1
        rollRest()
        await sync($)
      } else {
        slowTimer = $.clock.after(SLOW_MS, () => {
          // An interrupted call can leave this timer behind its turn.
          if (!S.isInTurn) return
          isSlow = true
          S.slowCalls += 1
          if (S.slowCalls === 1) rollRest()
          void sync($)
        })
      }
    } catch {
      // Display only.
    }

    let ran

    try {
      ran = await next(e)
    } finally {
      // Also when the call is interrupted, or the mascot would wait forever.
      slowTimer?.cancel()
      if (S.isInTurn && S.nextDoing !== undefined) note($)
      if (isSlow) S.slowCalls = Math.max(0, S.slowCalls - 1)
      if (isQuestion) S.questions = Math.max(0, S.questions - 1)
    }

    try {
      const isShell = e.tool === 'Bash' || e.tool === 'PowerShell'
      const input = e as { command?: unknown; run_in_background?: unknown }
      const hasFailed = ran.deny !== undefined || ran.isError === true

      if (isShell && input.run_in_background === true && !hasFailed) {
        S.hasBackgroundWork = true
      }
      const kind = isShell ? classify(input.command) : null

      // A call that wrote the task list: the notes follow with the next sync.
      if (!hasFailed) S.tasks = tasksAfter(S.tasks, e.tool, e, ran.result)

      // A git or gh command may have changed the branch, what is committed
      // or the pull request.
      if (isShell && /\b(git|gh)\b/.test(String(input.command ?? ''))) {
        await scout($)
        await air($)
        void survey($).catch(() => undefined)
      }

      if (kind === 'merge' && !hasFailed) {
        await flash($, { mascot: 'cheer', fx: 'fireworks', kitten: 'startle', news: 'Pull request merged!' }, 25_000)
      } else if (kind === 'commit' && !hasFailed) {
        await flash($, { mascot: 'cheer', fx: 'confetti', news: 'Committed' }, 9_000)
      } else if (kind === 'pr' && !hasFailed) {
        await flash($, { mascot: 'cheer', fx: 'confetti', news: 'Pull request opened' }, 9_000)
      } else if (kind === 'test' && !hasFailed) {
        await flash($, { mascot: 'cheer', fx: 'none', news: 'Tests passed' }, 4_000)
      } else if (kind === 'test') {
        await flash($, { mascot: 'facepalm', fx: 'none', news: 'Tests failed' }, 7_000)
      } else {
        // Any other call that failed: the desk says so for a moment.
        if (hasFailed && S.isInTurn) {
          note($, { kind: 'error', label: isShell ? 'command failed' : /^[A-Za-z]{1,16}$/.test(e.tool) ? `${e.tool} failed` : 'a tool failed' }, true)
        }
        await sync($)
      }
    } catch {
      // Display only: the tool's answer goes back untouched.
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'room' }, async ($, e) => {
    const words = e.args.toLowerCase().split(/\s+/).filter(Boolean)

    if (words.length === 0) {
      return { text: HELP }
    }
    // The last redraws and when, to set beside a flicker that was seen.
    if (words[0] === 'log') {
      const since = Date.now() - 60_000
      const lines = LOG.map(each => `  ${new Date(each.at).toTimeString().slice(0, 8)}  ${each.what}`)

      return { text: [`${LOG.filter(each => each.at > since).length} redraws in the last minute; the last ${LOG.length}:`, ...lines].join('\n') }
    }
    // The chores, on demand. They are moments, not poses: the room is not pinned.
    if (words.length === 1 && (words[0] === 'feed' || words[0] === 'water')) {
      if (words[0] === 'feed' && !O.hasKitten) return { text: 'There is no kitten to feed: the kitten option is off.' }
      S.showTimer?.cancel()
      S.show = undefined
      await update($, room, current => ({ ...current, isPinned: false }))
      await tend($, words[0])

      return { text: words[0] === 'feed' ? 'The kitten is fed.' : 'The plant is watered.' }
    }
    if (words.includes('auto')) {
      S.show = undefined
      await update($, room, current => ({ ...current, isPinned: false }))
      await sync($)

      return { text: 'The room follows the session again.' }
    }
    const patch: Partial<Room> = {}
    const unknown: string[] = []

    for (const word of words) {
      const kitten = word.replace(/^kitten-/, '') as KittenPose

      if ((PHASES as readonly string[]).includes(word)) {
        patch.phase = word as Phase
      } else if ((MASCOT_POSES as readonly string[]).includes(word)) {
        patch.mascot = word as MascotPose
      } else if (word.startsWith('kitten-') && KITTEN_POSES.includes(kitten)) {
        patch.kitten = kitten
      } else if (word === 'fireworks') {
        Object.assign(patch, { fx: 'fireworks', mascot: 'cheer', kitten: 'startle' })
      } else if (word === 'confetti') {
        Object.assign(patch, { fx: 'confetti', mascot: 'cheer' })
      } else if (word === 'rain' || word === 'clear') {
        patch.isRaining = word === 'rain'
      } else if (word === 'waiting') {
        patch.isWaiting = true
      } else {
        unknown.push(word)
      }
    }
    if (unknown.length > 0) {
      return { text: `Not something the room knows: ${unknown.join(', ')}\n${HELP}` }
    }
    await update($, room, (current): Room => {
      const { was, at, ...shown } = current

      return moved(current, { ...shown, fx: 'none', isWaiting: false, ...patch, isPinned: true })
    })

    return { text: `Room posed: ${words.join(' ')}. "/room auto" hands it back.` }
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    if (e.props.scene !== SCENE) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const state = await read($, room)
    // Read only so that a bump draws the scene again.
    await read($, resync)
    const now = new Date()
    const time = { h: now.getHours(), m: now.getMinutes(), s: now.getSeconds(), ms: now.getMilliseconds(), now: now.getTime(), day: dateLabel(now) }
    const look = {
      clock: O.clock,
      wall: O.wall,
      hasKitten: O.hasKitten,
      tv: O.hasTv ? await read($, tv) : undefined,
    }
    const alt = `A living room at ${state.phase}: the orange mascot is in its "${state.mascot}" pose${O.hasKitten ? ` and the kitten in its "${state.kitten}" pose` : ''}.`

    // The sandboxed frame is where the desktop app plays CSS animation.
    return <Svg source={buildScene(state, time, look)} alt={alt} isInteractive={e.surface === 'desktop'} />
  })
}
