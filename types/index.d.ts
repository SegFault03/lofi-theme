export type Phase = 'dawn' | 'day' | 'golden' | 'dusk' | 'night'

export type MascotPose =
  | 'phone'
  | 'window'
  | 'notice'
  | 'work'
  | 'scroll'
  | 'nap'
  | 'play'
  | 'sleep'
  | 'cheer'
  | 'facepalm'

export type KittenPose =
  | 'loaf'
  | 'sill'
  | 'yarn'
  | 'desk'
  | 'prowl'
  | 'sleep'
  | 'startle'
  | 'pounce'

export type Fx = 'none' | 'confetti' | 'fireworks'

export type Wall = 'slate' | 'plum' | 'forest' | 'clay'

export type Room = {
  phase: Phase
  mascot: MascotPose
  kitten: KittenPose
  fx: Fx
  isRaining: boolean
  /** A thought bubble with an hourglass: something is running without us. */
  isWaiting: boolean
  /** Set by `/room <something>`: the session stops moving the room by itself. */
  isPinned: boolean
}

/** One quota window: how full, and when it resets (`14:30`, `Tue 09:00`). */
export type Quota = { percent: number; resets?: string }

/** A pull request in one word, the worst news first (`prState` in `logic.js`). */
export type PrState = 'draft' | 'open' | 'pending' | 'failing' | 'passing' | 'changes' | 'merged' | 'closed'

/** What the wall TV shows. Every figure is rounded before it is stored. */
export type Screen = {
  project: string
  chat?: string
  /** Shown in place of a name that is not known yet. */
  greeting?: string
  /** The checked-out branch; absent outside a repository. */
  branch?: string
  /** Lines added and removed since the last commit; absent for a clean tree. */
  diff?: { added: number; removed: number }
  /** The branch's pull request, where `gh` finds one. */
  pr?: PrState
  fiveHour?: Quota
  week?: Quota
  context?: { window: number; tokens?: number; percent?: number }
  /** The ticker's items. */
  feed: string[]
}

declare module 'claude-code' {
  interface PluginState {
    'lofi-theme': { room: Shaped<Room>; resync: number; tv: Shaped<Screen> }
  }
}
