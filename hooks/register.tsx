import { atom, read, update } from 'claude-code'
import type { EngineInterface, PluginOptions, Register, Timer } from 'claude-code'

import type { Fx, KittenPose, MascotPose, Phase, Room, Wall } from '../types'
import {
  classify,
  isRainyDay,
  KITTEN_POSES,
  kittenPose,
  MASCOT_POSES,
  PHASES,
  phaseAt,
  restPose,
} from './logic.js'
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
  shape: 'room-1',
})
// Bumped to have the scene drawn again with the time as it is now: the clock's
// digits run on the scene's own CSS, which a sleeping machine leaves behind.
const resync = atom({ plugin: 'lofi-theme', key: 'resync' } as const, 0)

// What the person chose in the plugin's options (plugin.json's `userConfig`).
// A change there reloads this module, so they hold for the module's life.
type Options = {
  clock: '24h' | '12h'
  timeOfDay: 'auto' | Phase
  wall: Wall
  hasKitten: boolean
  hasCelebrations: boolean
  hasRain: boolean
}
const DEFAULTS: Options = {
  clock: '24h',
  timeOfDay: 'auto',
  wall: 'slate',
  hasKitten: true,
  hasCelebrations: true,
  hasRain: true,
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
  }
}

const SLOW_MS = 20_000 // a tool call this long is "waiting on a process"
const NOTICE_MS = 7_000 // how long the mascot stays perked up after a key
const IDLE_MS = 10 * 60_000 // quiet this long and the mascot follows the clock
const TICK_MS = 60_000
const HELP = [
  'Usage: /room <what>',
  `  time of day: ${PHASES.join(', ')}`,
  `  mascot: ${MASCOT_POSES.join(', ')}`,
  `  kitten: ${KITTEN_POSES.map(pose => `kitten-${pose}`).join(', ')}`,
  '  extras: fireworks, confetti, rain, clear',
  '  auto: let the session drive the room again',
].join('\n')

type Shown = { mascot: MascotPose; fx: Fx; kitten?: KittenPose }

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
}

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

  return { phase, mascot, kitten, fx, isRaining, isWaiting: isWaiting() }
}

// Sets the backdrop. The chat keeps the app's own panels and frosting: the
// room is drawn at the two sides, where nothing sits over it.
async function dress($: EngineInterface): Promise<void> {
  const set = await $.theme.set({
    backdrop: { scene: SCENE },
  })

  if (!set.isDrawn) {
    $.ui.status(`${PLUGIN}: ${set.reason}`)
  }
}

async function sync($: EngineInterface): Promise<void> {
  const current = await read($, room)

  if (current.isPinned) return
  const next: Room = { ...wanted(), isPinned: false }

  // Every write redraws the scene and restarts its animations, so only a
  // real change is written.
  if (JSON.stringify(next) !== JSON.stringify(current)) {
    await update($, room, () => next)
  }
}

// A moment that passes by itself: a cheer, a facepalm, the fireworks.
function flash($: EngineInterface, shown: Shown, ms: number): Promise<void> {
  if (!O.hasCelebrations) return sync($)
  S.showTimer?.cancel()
  S.show = shown
  S.showTimer = $.clock.after(ms, () => {
    S.show = undefined
    void sync($)
  })

  return sync($)
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
    rollRest()
    rollPet()
    await sync($)

    // Once a minute: follow the clock, and now and then let the two of them
    // find something else to do.
    S.lastTickAt = Date.now()
    $.clock.every(TICK_MS, () => {
      const now = Date.now()

      // A tick that comes late means the machine slept, and the scene's own
      // clock with it: draw the scene again so the digits tell the time.
      if (now - S.lastTickAt > TICK_MS * 1.5) {
        void update($, resync, count => count + 1).catch(() => undefined)
      }
      S.lastTickAt = now
      S.ticks += 1
      if (S.ticks % 3 === 0) rollPet()
      if (S.ticks % 4 === 0 && !S.isInTurn) rollRest()
      // Asleep at night once things have gone quiet; awake again by morning.
      if (!S.isInTurn && restMode() === 'idle') {
        const idle = restPose(hourNow(), 'idle', Math.random())

        if ((idle === 'sleep') !== (S.rest === 'sleep')) S.rest = idle
      }
      void sync($)
    })

    return next(e)
  })

  on('prompt.change', async ($, e, next) => {
    try {
      const isTyping = e.text.trim() !== '' && e.origin.kind !== 'plugin'

      if (isTyping && !S.isInTurn) {
        S.lastKeyAt = Date.now()
        S.lastActiveAt = S.lastKeyAt
        if (!S.isNoticing) {
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
      }
    } catch {
      // The backdrop never gets in the way of typing.
    }

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
        // The kitten likes a warm desk.
        if (Math.random() < 0.5) S.pet = 'desk'
        await sync($)
      } catch {
        // Display only.
      }
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      try {
        S.isInTurn = false
        S.slowCalls = 0
        S.questions = 0
        S.lastActiveAt = Date.now()
        if (S.pet === 'desk') rollPet()
        // Now it's the person's move: time to laze.
        rollRest()
        await sync($)
      } catch {
        // Display only.
      }
    }

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const isQuestion = e.tool === 'AskUserQuestion'
    let isSlow = false
    let slowTimer: Timer | undefined

    try {
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

      if (kind === 'merge' && !hasFailed) {
        await flash($, { mascot: 'cheer', fx: 'fireworks', kitten: 'startle' }, 25_000)
      } else if (kind === 'commit' && !hasFailed) {
        await flash($, { mascot: 'cheer', fx: 'confetti' }, 9_000)
      } else if (kind === 'test' && !hasFailed) {
        await flash($, { mascot: 'cheer', fx: 'none' }, 4_000)
      } else if (kind === 'test') {
        await flash($, { mascot: 'facepalm', fx: 'none' }, 7_000)
      } else {
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
    await update($, room, (current): Room => ({
      ...current,
      fx: 'none',
      isWaiting: false,
      ...patch,
      isPinned: true,
    }))

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
    const time = { h: now.getHours(), m: now.getMinutes(), s: now.getSeconds() }
    const look = { clock: O.clock, wall: O.wall, hasKitten: O.hasKitten }
    const alt = `A living room at ${state.phase}: the orange mascot is in its "${state.mascot}" pose${O.hasKitten ? ` and the kitten in its "${state.kitten}" pose` : ''}.`

    // The sandboxed frame is where the desktop app plays CSS animation.
    return <Svg source={buildScene(state, time, look)} alt={alt} isInteractive={e.surface === 'desktop'} />
  })
}
