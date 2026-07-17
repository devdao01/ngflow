import { isNodeBase, isEdgeBase, type XYPosition } from '@xyflow/system';

import type { Edge, Node } from '../types';

/**
 * Test whether an object is usable as a Node
 * @public
 * @remarks In TypeScript this is a type guard that will narrow the type of whatever you pass in to Node if it returns true
 * @param element - The element to test
 * @returns A boolean indicating whether the element is an Node
 */
export const isNode = <NodeType extends Node = Node>(element: unknown): element is NodeType =>
  isNodeBase<NodeType>(element);

/**
 * Test whether an object is usable as an Edge
 * @public
 * @remarks In TypeScript this is a type guard that will narrow the type of whatever you pass in to Edge if it returns true
 * @param element - The element to test
 * @returns A boolean indicating whether the element is an Edge
 */
export const isEdge = <EdgeType extends Edge = Edge>(element: unknown): element is EdgeType =>
  isEdgeBase<EdgeType>(element);

/**
 * Normalizes a clsx-style ClassValue into a class string (Angular's [class]
 * binding does not support objects nested inside arrays).
 */
export function cc(value: import('../types/utils').ClassValue): string {
  if (value === null || value === undefined || value === false || value === true) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return `${value}`;
  }
  if (Array.isArray(value)) {
    return value.map(cc).filter(Boolean).join(' ');
  }
  return Object.keys(value)
    .filter((key) => !!(value as Record<string, unknown>)[key])
    .join(' ');
}

export function toPxString(value: number | undefined): string | undefined {
  return value === undefined ? undefined : `${value}px`;
}

export * from './edges';
export * from './media-query';

export const arrowKeyDiffs: Record<string, XYPosition> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};
