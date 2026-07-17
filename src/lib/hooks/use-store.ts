import { inject } from '@angular/core';
import { errorMessages } from '@xyflow/system';

import { FLOW_STORE_CONTEXT } from '../store/context';
import type { NgFlowStore, StoreContext } from '../store/types';
import type { Edge, Node } from '../types';

const providerErrorMessage = errorMessages['error001']('ngflow');

/**
 * Returns a lazy store accessor. Reading through the getter keeps hooks
 * reactive to the NgFlowProvider store swap (the provider's getStore reads a
 * signal). Must be called in an injection context.
 */
export function injectStoreGetter<NodeType extends Node = Node, EdgeType extends Edge = Edge>(): () => NgFlowStore<
  NodeType,
  EdgeType
> {
  const storeContext = inject(FLOW_STORE_CONTEXT, { optional: true }) as StoreContext<
    NodeType,
    EdgeType
  > | null;

  if (!storeContext) {
    throw new Error(providerErrorMessage);
  }

  return () => storeContext.getStore();
}

/**
 * Direct store access (Angular version of Svelte Flow's useStore).
 * Must be called in an injection context.
 */
export function useStore<NodeType extends Node = Node, EdgeType extends Edge = Edge>(): NgFlowStore<
  NodeType,
  EdgeType
> {
  return injectStoreGetter<NodeType, EdgeType>()();
}
