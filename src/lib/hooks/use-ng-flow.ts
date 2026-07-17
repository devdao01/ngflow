import { untracked } from '@angular/core';
import {
  getOverlappingArea,
  isRectObject,
  nodeToRect,
  pointToRendererPoint,
  type FitBoundsOptions,
  type SetCenterOptions,
  type Viewport,
  type ViewportHelperFunctionOptions,
  type XYPosition,
  type ZoomInOut,
  type Rect,
  getViewportForBounds,
  rendererPointToPoint,
  evaluateAbsolutePosition,
  type HandleType,
  type HandleConnection,
  getNodesBounds
} from '@xyflow/system';

import { injectStoreGetter } from './use-store';
import type { NgFlowStore } from '../store/types';
import { deleteElements } from '../utils/delete-elements';
import type { Edge, FitViewOptions, InternalNode, Node } from '../types';
import { isEdge, isNode } from '../utils';

export type NgFlowHelpers<NodeType extends Node = Node, EdgeType extends Edge = Edge> = {
  /** Zooms viewport in by 1.2. */
  zoomIn: ZoomInOut;
  /** Zooms viewport out by 1 / 1.2. */
  zoomOut: ZoomInOut;
  /** Returns an internal node by id. */
  getInternalNode: (id: string) => InternalNode<NodeType> | undefined;
  /** Returns a node by id. */
  getNode: (id: string) => NodeType | undefined;
  /** Returns nodes. */
  getNodes: (ids?: string[]) => NodeType[];
  /** Returns an edge by id. */
  getEdge: (id: string) => EdgeType | undefined;
  /** Returns edges. */
  getEdges: (ids?: string[]) => EdgeType[];
  /** Sets the current zoom level. */
  setZoom: (zoomLevel: number, options?: ViewportHelperFunctionOptions) => Promise<boolean>;
  /** Returns the current zoom level. */
  getZoom: () => number;
  /** Sets the center of the view to the given position. */
  setCenter: (x: number, y: number, options?: SetCenterOptions) => Promise<boolean>;
  /** Sets the current viewport. */
  setViewport: (viewport: Viewport, options?: ViewportHelperFunctionOptions) => Promise<boolean>;
  /** Returns the current viewport. */
  getViewport: () => Viewport;
  /** Fits the view. */
  fitView: (options?: FitViewOptions<NodeType>) => Promise<boolean>;
  /** Returns all nodes that intersect with the given node or rect. */
  getIntersectingNodes: (
    nodeOrRect: NodeType | { id: NodeType['id'] } | Rect,
    partially?: boolean,
    nodesToIntersect?: NodeType[]
  ) => NodeType[];
  /** Checks if the given node or rect intersects with the passed rect. */
  isNodeIntersecting: (
    nodeOrRect: NodeType | { id: NodeType['id'] } | Rect,
    area: Rect,
    partially?: boolean
  ) => boolean;
  /** Fits the view to the given bounds. */
  fitBounds: (bounds: Rect, options?: FitBoundsOptions) => Promise<boolean>;
  /** Deletes nodes and edges. */
  deleteElements: ({
    nodes,
    edges
  }: {
    nodes?: (Partial<NodeType> & { id: string })[];
    edges?: (Partial<EdgeType> & { id: string })[];
  }) => Promise<{ deletedNodes: NodeType[]; deletedEdges: EdgeType[] }>;
  /** Converts a screen / client position to a flow position. */
  screenToFlowPosition: (clientPosition: XYPosition, options?: { snapToGrid: boolean }) => XYPosition;
  /** Converts a flow position to a screen / client position. */
  flowToScreenPosition: (flowPosition: XYPosition) => XYPosition;
  /** Updates a node. */
  updateNode: (
    id: string,
    nodeUpdate: Partial<NodeType> | ((node: NodeType) => Partial<NodeType>),
    options?: { replace: boolean }
  ) => void;
  /** Updates the data attribute of a node. */
  updateNodeData: (
    id: string,
    dataUpdate: Partial<NodeType['data']> | ((node: NodeType) => Partial<NodeType['data']>),
    options?: { replace: boolean }
  ) => void;
  /** Updates an edge. */
  updateEdge: (
    id: string,
    edgeUpdate: Partial<EdgeType> | ((edge: EdgeType) => Partial<EdgeType>),
    options?: { replace: boolean }
  ) => void;
  /** Returns the nodes, edges and the viewport as a JSON object. */
  toObject: () => { nodes: NodeType[]; edges: EdgeType[]; viewport: Viewport };
  /** Returns the bounds of the given nodes or node ids. */
  getNodesBounds: (nodes: (NodeType | InternalNode<NodeType> | string)[]) => Rect;
  /** Gets all connections for a given handle belonging to a specific node. */
  getHandleConnections: ({
    type,
    id,
    nodeId
  }: {
    type: HandleType;
    nodeId: string;
    id?: string | null;
  }) => HandleConnection[];
};

/**
 * Hook for accessing the NgFlow instance. Must be called in an injection
 * context (e.g. a component constructor or field initializer).
 *
 * @public
 * @returns A set of helper functions
 */
export function useNgFlow<NodeType extends Node = Node, EdgeType extends Edge = Edge>(): NgFlowHelpers<
  NodeType,
  EdgeType
> {
  return createFlowHelpers(injectStoreGetter<NodeType, EdgeType>());
}

/**
 * Builds the NgFlow helper set from a store accessor. Useful outside of a
 * flow's injection context, e.g. with a viewChild reference:
 * `createFlowHelpers(() => this.flowRef().store)`.
 *
 * @public
 */
export function createFlowHelpers<NodeType extends Node = Node, EdgeType extends Edge = Edge>(
  getStore: () => NgFlowStore<NodeType, EdgeType>
): NgFlowHelpers<NodeType, EdgeType> {

  const getNodeRect = (node: NodeType | { id: NodeType['id'] }): Rect | null => {
    const store = getStore();
    const nodeToUse = isNode<NodeType>(node) ? node : store.nodeLookup.get(node.id)!;
    const position = nodeToUse.parentId
      ? evaluateAbsolutePosition(
          nodeToUse.position,
          nodeToUse.measured,
          nodeToUse.parentId,
          store.nodeLookup,
          store.nodeOrigin
        )
      : nodeToUse.position;

    const nodeWithPosition = {
      ...nodeToUse,
      position,
      width: nodeToUse.measured?.width ?? nodeToUse.width,
      height: nodeToUse.measured?.height ?? nodeToUse.height
    };

    return nodeToRect(nodeWithPosition);
  };

  function updateNode(
    id: string,
    nodeUpdate: Partial<NodeType> | ((node: NodeType) => Partial<NodeType>),
    options: { replace: boolean } = { replace: false }
  ) {
    const store = getStore();
    store.nodes = untracked(() => store.nodes).map((node) => {
      if (node.id === id) {
        const nextNode = typeof nodeUpdate === 'function' ? nodeUpdate(node) : nodeUpdate;
        return options?.replace && isNode<NodeType>(nextNode) ? nextNode : { ...node, ...nextNode };
      }

      return node;
    });
  }

  function updateEdge(
    id: string,
    edgeUpdate: Partial<EdgeType> | ((edge: EdgeType) => Partial<EdgeType>),
    options: { replace: boolean } = { replace: false }
  ) {
    const store = getStore();
    store.edges = untracked(() => store.edges).map((edge) => {
      if (edge.id === id) {
        const nextEdge = typeof edgeUpdate === 'function' ? edgeUpdate(edge) : edgeUpdate;
        return options.replace && isEdge<EdgeType>(nextEdge) ? nextEdge : { ...edge, ...nextEdge };
      }

      return edge;
    });
  }

  const getInternalNode = (id: string) => getStore().nodeLookup.get(id);

  return {
    zoomIn: (options) => getStore().zoomIn(options),
    zoomOut: (options) => getStore().zoomOut(options),
    getInternalNode,
    getNode: (id) => getInternalNode(id)?.internals.userNode,
    getNodes: (ids) => (ids === undefined ? getStore().nodes : getElements(getStore().nodeLookup, ids)),
    getEdge: (id) => getStore().edgeLookup.get(id),
    getEdges: (ids) => (ids === undefined ? getStore().edges : getElements(getStore().edgeLookup, ids)),
    setZoom: async (zoomLevel, options) => {
      const panZoom = getStore().panZoom;
      return panZoom ? panZoom.scaleTo(zoomLevel, options) : false;
    },
    getZoom: () => getStore().viewport.zoom,
    setViewport: async (nextViewport, options) => {
      const store = getStore();
      const currentViewport = store.viewport;

      if (!store.panZoom) {
        return false;
      }

      await store.panZoom.setViewport(
        {
          x: nextViewport.x ?? currentViewport.x,
          y: nextViewport.y ?? currentViewport.y,
          zoom: nextViewport.zoom ?? currentViewport.zoom
        },
        options
      );

      return true;
    },
    getViewport: () => ({ ...getStore().viewport }),
    setCenter: async (x, y, options) => getStore().setCenter(x, y, options),
    fitView: (options?: FitViewOptions<NodeType>) => getStore().fitView(options),
    fitBounds: async (bounds: Rect, options?: FitBoundsOptions) => {
      const store = getStore();
      if (!store.panZoom) {
        return false;
      }

      const viewport = getViewportForBounds(
        bounds,
        store.width,
        store.height,
        store.minZoom,
        store.maxZoom,
        options?.padding ?? 0.1
      );

      await store.panZoom.setViewport(viewport, {
        duration: options?.duration,
        ease: options?.ease,
        interpolate: options?.interpolate
      });

      return true;
    },
    /**
     * Partial is defined as "the 2 nodes/areas are intersecting partially".
     * If a is contained in b or b is contained in a, they are both
     * considered fully intersecting.
     */
    getIntersectingNodes: (
      nodeOrRect: NodeType | { id: NodeType['id'] } | Rect,
      partially = true,
      nodesToIntersect?: NodeType[]
    ) => {
      const store = getStore();
      const isRect = isRectObject(nodeOrRect);
      const nodeRect = isRect ? nodeOrRect : getNodeRect(nodeOrRect);

      if (!nodeRect) {
        return [];
      }

      return (nodesToIntersect || store.nodes).filter((n) => {
        const internalNode = store.nodeLookup.get(n.id);
        if (!internalNode || (!isRect && n.id === (nodeOrRect as { id: string }).id)) {
          return false;
        }

        const currNodeRect = nodeToRect(internalNode);
        const overlappingArea = getOverlappingArea(currNodeRect, nodeRect);
        const partiallyVisible = partially && overlappingArea > 0;

        return (
          partiallyVisible ||
          overlappingArea >= currNodeRect.width * currNodeRect.height ||
          overlappingArea >= nodeRect.width * nodeRect.height
        );
      });
    },
    isNodeIntersecting: (
      nodeOrRect: NodeType | { id: NodeType['id'] } | Rect,
      area: Rect,
      partially = true
    ) => {
      const isRect = isRectObject(nodeOrRect);
      const nodeRect = isRect ? nodeOrRect : getNodeRect(nodeOrRect);

      if (!nodeRect) {
        return false;
      }

      const overlappingArea = getOverlappingArea(nodeRect, area);
      const partiallyVisible = partially && overlappingArea > 0;

      return (
        partiallyVisible ||
        overlappingArea >= area.width * area.height ||
        overlappingArea >= nodeRect.width * nodeRect.height
      );
    },
    deleteElements: async (params) => deleteElements(getStore(), params),
    screenToFlowPosition: (position: XYPosition, options: { snapToGrid: boolean } = { snapToGrid: true }) => {
      const store = getStore();
      if (!store.domNode) {
        return position;
      }

      const _snapGrid = options.snapToGrid ? store.snapGrid : false;
      const { x, y, zoom } = store.viewport;
      const { x: domX, y: domY } = store.domNode.getBoundingClientRect();
      const correctedPosition = {
        x: position.x - domX,
        y: position.y - domY
      };

      return pointToRendererPoint(correctedPosition, [x, y, zoom], _snapGrid !== null, _snapGrid || [1, 1]);
    },
    flowToScreenPosition: (position: XYPosition) => {
      const store = getStore();
      if (!store.domNode) {
        return position;
      }

      const { x, y, zoom } = store.viewport;
      const { x: domX, y: domY } = store.domNode.getBoundingClientRect();
      const rendererPosition = rendererPointToPoint(position, [x, y, zoom]);

      return {
        x: rendererPosition.x + domX,
        y: rendererPosition.y + domY
      };
    },

    toObject: () => {
      const store = getStore();
      return structuredClone({
        nodes: [...store.nodes],
        edges: [...store.edges],
        viewport: { ...store.viewport }
      });
    },
    updateNode,
    updateNodeData: (id, dataUpdate, options) => {
      const node = getStore().nodeLookup.get(id)?.internals.userNode;

      if (!node) {
        return;
      }

      const nextData = typeof dataUpdate === 'function' ? dataUpdate(node) : dataUpdate;
      updateNode(id, (node) => ({
        ...node,
        data: options?.replace ? nextData : { ...node.data, ...nextData }
      }));
    },
    updateEdge,
    getNodesBounds: (nodes) => {
      const store = getStore();
      return getNodesBounds(nodes, { nodeLookup: store.nodeLookup, nodeOrigin: store.nodeOrigin });
    },
    getHandleConnections: ({ type, id, nodeId }) =>
      Array.from(getStore().connectionLookup.get(`${nodeId}-${type}-${id ?? null}`)?.values() ?? [])
  };
}

function getElements<NodeType extends Node = Node>(
  lookup: Map<string, InternalNode<NodeType>>,
  ids: string[]
): NodeType[];
function getElements<EdgeType extends Edge = Edge>(lookup: Map<string, EdgeType>, ids: string[]): EdgeType[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getElements(lookup: Map<string, any>, ids: string[]): any[] {
  const result = [];

  for (const id of ids) {
    const item = lookup.get(id);

    if (item) {
      const element = 'internals' in item ? item.internals?.userNode : item;
      result.push(element);
    }
  }

  return result;
}
