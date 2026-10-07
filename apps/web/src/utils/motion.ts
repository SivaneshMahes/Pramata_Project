import type { Transition } from 'motion/react';

/**
 * Critically damped (no overshoot) — the default for UI that the user did not
 * throw. Springs start from the current on-screen value, so any of these can
 * be interrupted and reversed mid-flight without a jump.
 */
export const SPRING_DEFAULT: Transition = { type: 'spring', bounce: 0, duration: 0.32 };

/** Slightly quicker settle for small elements (indicators, chips). */
export const SPRING_SNAPPY: Transition = { type: 'spring', bounce: 0, duration: 0.24 };
