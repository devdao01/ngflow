/**
 * Angular counterparts of the DOM-flavored helper types the Svelte package
 * pulls from `svelte/elements`.
 */

/** clsx-style class value (normalized with `cc()` before hitting the DOM). */
export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Record<string, boolean | undefined | null>
  | ClassValue[];

/** Accepted by Angular's `[style]` binding (inline style string or style map). */
export type StyleValue = string;

/**
 * Escape hatch for custom attributes on node/edge DOM elements.
 * Applied via `setAttribute`, so values are stringified.
 */
export type DomAttributes = Record<string, string | number | boolean>;
