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

/** What the tool in hand is, and a few words for it (`editing scene.js`). */
export type Doing = { kind: 'think' | 'error' | 'read' | 'edit' | 'shell' | 'web'; label: string }

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
  /** The tool in hand while the mascot works: the monitor and the ticker show it. */
  doing?: Doing
  /** A word for the moment being shown (`Tests passed`): it leads the TV's ticker. */
  news?: string
  /** How many subagents are at work, up to three: a small helper by the desk for each. */
  helpers?: number
  /** The task list, a letter a task (`p` pending, `a` in hand, `d` done), eight at most: the notes under the shelf. */
  notes?: string
  /** The coffee left in the mug, 4 (full) to 0, as the context fills. */
  cup?: number
  /** The poses before the last change of pose, and when that was (ms): the scene draws the move. */
  was?: { mascot: MascotPose; kitten: KittenPose }
  at?: number
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
  /** Its number, written on the card as `#16`. */
  prNumber?: number
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
