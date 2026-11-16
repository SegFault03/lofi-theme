import type { Doing, KittenPose, MascotPose, Phase, PrState, Screen } from '../types'

export const PHASES: readonly Phase[]
export const MASCOT_POSES: readonly MascotPose[]
export const KITTEN_POSES: readonly KittenPose[]
export function phaseAt(hour: number): Phase
export function restPose(
  hour: number,
  mode: 'waiting' | 'idle',
  r: number,
): MascotPose
export function kittenPose(phase: Phase, r: number): KittenPose
export function classify(command: unknown): 'merge' | 'commit' | 'test' | null
export function isRainyDay(dayNumber: number): boolean
export function activityOf(tool: unknown, input?: unknown): Doing | undefined

/** What the session knows that the TV shows; any of it may be missing. */
export type ScreenFacts = {
  project?: string
  chat?: string
  /** The person's login name, for the greeting. */
  user?: string
  /** The checked-out branch, where the folder is in a git repository. */
  branch?: string
  diff?: { added: number; removed: number }
  pr?: PrState
  prNumber?: number
  /** When the request was merged, in ms; its card goes a day later. */
  prMergedAt?: number
  turns?: number
  startedAt?: number
  context?: { tokens?: number; window: number; percent?: number }
  rateLimits?: readonly { kind: string; percentUsed: number; resetsAt?: string }[]
  cost?: { usd: number }
}
export function folderName(path: unknown): string
export function resetLabel(iso: string | undefined, now?: Date): string | undefined
export const PR_STATES: readonly PrState[]
export function diffStat(text: unknown): { added: number; removed: number } | undefined
export function prState(json: unknown): PrState | undefined
export const MERGED_SHOWN_MS: number
export function prFacts(json: unknown): { state: PrState; number?: number; mergedAt?: number } | undefined
export function dateLabel(now?: Date): string
export function greeting(hour: number, name?: string): string
export function screenOf(facts: ScreenFacts, now?: Date): Screen
