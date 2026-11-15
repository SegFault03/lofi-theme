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

declare module 'claude-code' {
  interface PluginState {
    'lofi-theme': { room: Shaped<Room>; resync: number }
  }
}
