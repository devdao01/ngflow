import { computed, effect } from '@angular/core';
import {
  areConnectionMapsEqual,
  handleConnectionChange,
  shallowNodeData,
  type ConnectionState,
  type DistributivePick,
  type NodeConnection,
  type UseNodeConnectionsParams,
  type Viewport
} from '@xyflow/system';

import { injectStoreGetter } from './use-store';
import { injectNodeId } from '../store/context';
import type { Edge, InternalNode, Node, OnSelectionChange } from '../types';

/**
 * Hook for receiving the current connection.
 *
 * @public
 * @returns Current connection as a reactive `{ current }` box
 */
export function useConnection(): { current: ConnectionState } {
  const getStore = injectStoreGetter();
  const connection = computed(() => getStore().connection);

  return {
    get current() {
      return connection();
    }
  };
}

/**
 * Hook to get an internal node by id.
 *
 * @public
 * @param id - the node id
 * @returns An internal node or undefined
 */
export function useInternalNode(id: string): { current: InternalNode | undefined } {
  const getStore = injectStoreGetter();

  const node = computed(() => {
    const store = getStore();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    store.nodes;
    return store.nodeLookup.get(id);
  });

  return {
    get current() {
      return node();
    }
  };
}

/**
 * Hook for receiving data of one or multiple nodes
 *
 * @public
 * @param nodeIds - The id (or ids) of the node to get the data from
 * @returns A reactive `{ current }` box with data objects
 */
export function useNodesData<NodeType extends Node = Node>(
  nodeId: string
): { current: DistributivePick<NodeType, 'id' | 'data' | 'type'> | null };
export function useNodesData<NodeType extends Node = Node>(
  nodeIds: string[]
): { current: DistributivePick<NodeType, 'id' | 'data' | 'type'>[] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useNodesData(nodeIds: any): any {
  const getStore = injectStoreGetter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prevNodesData: any[] = [];
  let initialRun = true;

  const nodeData = computed(() => {
    const store = getStore();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    store.nodes;
    const nextNodesData = [];
    const isArrayOfIds = Array.isArray(nodeIds);
    const _nodeIds = isArrayOfIds ? nodeIds : [nodeIds];

    for (const nodeId of _nodeIds) {
      const node = store.nodeLookup.get(nodeId)?.internals.userNode;
      if (node) {
        nextNodesData.push({
          id: node.id,
          type: node.type,
          data: node.data
        });
      }
    }

    if (!shallowNodeData(nextNodesData, prevNodesData) || initialRun) {
      prevNodesData = nextNodesData;
      initialRun = false;
    }

    return isArrayOfIds ? prevNodesData : (prevNodesData[0] ?? null);
  });

  return {
    get current() {
      return nodeData();
    }
  };
}

type ConnectionMap = Map<string, NodeConnection>;

const initialConnections: NodeConnection[] = [];

/**
 * Hook to retrieve all edges connected to a node. Can be filtered by handle type and id.
 *
 * @public
 */
export function useNodeConnections({
  id,
  handleType,
  handleId,
  onConnect,
  onDisconnect
}: UseNodeConnectionsParams = {}) {
  const getStore = injectStoreGetter();

  const contextNodeId = injectNodeId();
  const nodeId = id ?? contextNodeId;

  let connectionMaps: { previous: ConnectionMap; next: ConnectionMap } = {
    previous: new Map(),
    next: new Map()
  };
  let connectionsArray: NodeConnection[] = initialConnections;

  const connections = computed(() => {
    const store = getStore();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    store.edges;

    const prevConnections = connectionMaps.next;
    const nextConnections =
      store.connectionLookup.get(
        `${nodeId}${handleType ? (handleId ? `-${handleType}-${handleId}` : `-${handleType}`) : ''}`
      ) ?? new Map();
    if (!areConnectionMapsEqual(nextConnections, prevConnections)) {
      connectionMaps = {
        previous: prevConnections,
        next: nextConnections
      };
      connectionsArray = Array.from(nextConnections.values() || initialConnections);
    }
    return connectionsArray;
  });

  effect(() => {
    // We subscribe to changes to the connections only when onConnect/onDisconnect are provided
    if (onConnect) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      connections();
      handleConnectionChange(connectionMaps.next, connectionMaps.previous, onConnect);
    }

    if (onDisconnect) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      connections();
      handleConnectionChange(connectionMaps.previous, connectionMaps.next, onDisconnect);
    }
  });

  return {
    get current() {
      return connections();
    }
  };
}

/**
 * When you programmatically add or remove handles to a node or update a node's
 * handle position, you need to let Ng Flow know about it using this hook.
 *
 * @public
 */
export function useUpdateNodeInternals(): (nodeId?: string | string[]) => void {
  const getStore = injectStoreGetter();
  const nodeId = injectNodeId();

  const updateInternals = (id?: string | string[]) => {
    const store = getStore();
    if (!id && !nodeId) {
      throw new Error('When using outside of a node, you must provide an id.');
    }
    const updateIds = id ? (Array.isArray(id) ? id : [id]) : [nodeId];
    const updates = new Map();

    updateIds.forEach((updateId) => {
      const nodeElement = store.domNode?.querySelector(
        `.ng-flow__node[data-id="${updateId}"]`
      ) as HTMLDivElement;

      if (nodeElement) {
        updates.set(updateId, { id: updateId, nodeElement, force: true });
      }
    });

    requestAnimationFrame(() => updateNodeInternals(getStore, updates));
  };

  return updateInternals;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateNodeInternals(getStore: () => any, updates: Map<string, unknown>) {
  getStore().updateNodeInternals(updates);
}

/**
 * Hook for seeing if nodes are initialized
 * @public
 */
export function useNodesInitialized() {
  const getStore = injectStoreGetter();
  return {
    get current() {
      return getStore().nodesInitialized;
    }
  };
}

/**
 * Hook for seeing if the viewport is initialized
 * @public
 */
export function useViewportInitialized() {
  const getStore = injectStoreGetter();
  return {
    get current() {
      return getStore().viewportInitialized;
    }
  };
}

/**
 * Hook for getting the current nodes from the store.
 * @public
 */
export function useNodes<NodeType extends Node = Node>() {
  const getStore = injectStoreGetter<NodeType>();
  return {
    get current() {
      return getStore().nodes;
    },
    set current(nodes: NodeType[]) {
      getStore().nodes = nodes;
    },
    update(updateFn: (nodes: NodeType[]) => NodeType[]) {
      getStore().nodes = updateFn(getStore().nodes);
    },
    set(nodes: NodeType[]) {
      getStore().nodes = nodes;
    }
  };
}

/**
 * Hook for getting the current edges from the store.
 * @public
 */
export function useEdges<EdgeType extends Edge = Edge>() {
  const getStore = injectStoreGetter<Node, EdgeType>();
  return {
    get current() {
      return getStore().edges;
    },
    set current(edges: EdgeType[]) {
      getStore().edges = edges;
    },
    update(updateFn: (edges: EdgeType[]) => EdgeType[]) {
      getStore().edges = updateFn(getStore().edges);
    },
    set(edges: EdgeType[]) {
      getStore().edges = edges;
    }
  };
}

/**
 * Hook for getting the current viewport from the store.
 * @public
 */
export function useViewport() {
  const getStore = injectStoreGetter();
  return {
    get current() {
      return getStore().viewport;
    },
    set current(viewport: Viewport) {
      getStore().viewport = viewport;
    },
    update(updateFn: (viewport: Viewport) => Viewport) {
      getStore().viewport = updateFn(getStore().viewport);
    },
    set(viewport: Viewport) {
      getStore().viewport = viewport;
    }
  };
}

/**
 * Registers a selection change handler.
 * @public
 */
export function useOnSelectionChange(onselectionchange: OnSelectionChange) {
  const getStore = injectStoreGetter();
  const symbol = Symbol();

  effect((onCleanup) => {
    const store = getStore();
    store.selectionChangeHandlers.set(symbol, onselectionchange);

    onCleanup(() => {
      store.selectionChangeHandlers.delete(symbol);
    });
  });
}
