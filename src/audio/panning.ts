import type { Part } from '../types'

/**
 * Angular positions (radians) of each voice part in the barbershop circle.
 * Clockwise from north: tenor(0°) → lead(90°) → bass(180°) → baritone(270°).
 */
const CIRCLE_ANGLE: Record<Part, number> = {
  tenor: 0,
  lead:  Math.PI / 2,
  bass:  Math.PI,
  bari:  (3 * Math.PI) / 2,
}

const PAN_SCALE = 0.5

/**
 * Compute the stereo pan for a voice part from the listener's (user's) perspective.
 * Returns a value in [-0.5, 0.5], or 0 for the user's own part (center).
 *
 * Arrangement (clockwise): tenor → lead → bass → baritone.
 * Example: baritone listener hears lead=0, bass=+0.5 (right), tenor=-0.5 (left).
 */
export function getPan(listenerPart: Part, voicePart: Part): number {
  if (listenerPart === voicePart) return 0
  const P = CIRCLE_ANGLE[listenerPart]
  const V = CIRCLE_ANGLE[voicePart]
  return -Math.sin(V - P) * PAN_SCALE
}
