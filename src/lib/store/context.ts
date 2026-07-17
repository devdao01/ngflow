import { InjectionToken, inject, type Signal } from '@angular/core';
import { errorMessages } from '@xyflow/system';

import type { Node, Edge } from '../types';
import type { NgFlowStore, StoreContext } from './types';

/**
 * DI replacement for the Svelte store context. NgFlow provides it for its
 * children; NgFlowProvider provides it above a flow to share the store.
 */
export const FLOW_STORE_CONTEXT = new InjectionToken<StoreContext>('ngflow.store');

const providerErrorMessage = errorMessages['error001']('ngflow');

export function injectStore<NodeType extends Node = Node, EdgeType extends Edge = Edge>(): NgFlowStore<
  NodeType,
  EdgeType
> {
  const storeContext = inject(FLOW_STORE_CONTEXT, { optional: true }) as
    | StoreContext<NodeType, EdgeType>
    | null;

  if (!storeContext) {
    throw new Error(providerErrorMessage);
  }

  return storeContext.getStore();
}

/** Id of the node a component (e.g. Handle) lives in. Provided per rendered node. */
export const NODE_ID = new InjectionToken<string>('ngflow.nodeId');

/** Whether the surrounding node is connectable (reactive). Provided per rendered node. */
export type ConnectableContext = Signal<boolean>;
export const NODE_CONNECTABLE = new InjectionToken<ConnectableContext>('ngflow.nodeConnectable');

/** Id of the edge a component (e.g. EdgeLabel) lives in. Provided per rendered edge. */
export const EDGE_ID = new InjectionToken<string>('ngflow.edgeId');

export function injectNodeId(errorMessage?: string): string {
  const id = inject(NODE_ID, { optional: true });
  if (errorMessage && id === null) {
    throw new Error(errorMessage);
  }
  return id as string;
}

export function injectNodeConnectable(): ConnectableContext | null {
  return inject(NODE_CONNECTABLE, { optional: true });
}

export function injectEdgeId(errorMessage?: string): string {
  const id = inject(EDGE_ID, { optional: true });
  if (errorMessage && id === null) {
    throw new Error(errorMessage);
  }
  return id as string;
}
