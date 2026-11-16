import type { Room, Screen, Wall } from '../types'

/** A wall-clock time; `s` defaults to 0. */
/** `day` is the date under the clock, as `dateLabel` writes it. */
/** `ms` defaults to 0. Every loop starts as far into its turn as the time says. */
/** `now` is the clock `Room.at` is read by (ms): without it no change of pose is drawn as a move. */
export type Time = { h: number; m: number; s?: number; ms?: number; now?: number; day?: string }

/** What the person chose in the plugin's options. */
export type Look = { clock?: '24h' | '12h'; wall?: Wall; hasKitten?: boolean; tv?: Screen }

/** One glyph of the digital clock: lit for its slot of its column's turn. */
export type ClockGlyph = {
  name: string
  x: number
  label: string
  period: number
  delay: number
  isLit: boolean
}

/** The walls on offer: top and bottom of each gradient. */
export const WALLS: Readonly<Record<Wall, readonly [string, string]>>

/** The clock's columns (hour, minute tens, minute ones), every glyph of each. */
export function clockColumns(time: Time, format?: '24h' | '12h'): ClockGlyph[][]

/** The whole backdrop as one SVG document, for a room state and a wall-clock time. */
export function buildScene(room: Omit<Room, 'isPinned'>, time?: Time, look?: Look): string
