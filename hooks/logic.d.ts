import type { KittenPose, MascotPose, Phase } from '../types'

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
