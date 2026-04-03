/**
 * Card utility functions.
 *
 * Pure helper functions for card-related operations that don't belong
 * to a specific component. [CLEAN-CODE] [DRY]
 */
import type { Color, Suit } from '../types';

/** Returns the color ('red' or 'black') of the given suit. */
export function suitColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}
