import { XYDrag, type NodeBase, type OnDrag } from '@xyflow/system';

import type { NgFlowStore } from '../store/types';
import type { Node, Edge } from '../types';

export type DragHandlerParams = {
  domNode: Element;
  disabled?: boolean;
  noDragClass?: string;
  handleSelector?: string;
  nodeId?: string;
  isSelectable?: boolean;
  nodeClickDistance?: number;
};

export type CreateDragHandlerParams<NodeType extends Node = Node, EdgeType extends Edge = Edge> = {
  store: NgFlowStore<NodeType, EdgeType>;
  onDrag?: OnDrag;
  onDragStart?: OnDrag;
  onDragStop?: OnDrag;
  onNodeMouseDown?: (id: string) => void;
};

/**
 * Angular counterpart of the Svelte `use:drag` action: create once, call
 * `update` from an effect whenever params change, `destroy` on teardown.
 */
export function createDragHandler<NodeType extends Node = Node, EdgeType extends Edge = Edge>(
  params: CreateDragHandlerParams<NodeType, EdgeType>
) {
  const { store, onDrag, onDragStart, onDragStop, onNodeMouseDown } = params;

  const dragInstance = XYDrag<NodeType, EdgeType>({
    onDrag,
    onDragStart,
    onDragStop,
    onNodeMouseDown,
    getStoreItems: () => {
      const { snapGrid, viewport } = store;

      return {
        nodes: store.nodes satisfies NodeBase[],
        nodeLookup: store.nodeLookup,
        edges: store.edges,
        nodeExtent: store.nodeExtent,
        snapGrid: snapGrid ? snapGrid : [0, 0],
        snapToGrid: !!snapGrid,
        nodeOrigin: store.nodeOrigin,
        multiSelectionActive: store.multiselectionKeyPressed,
        domNode: store.domNode,
        transform: [viewport.x, viewport.y, viewport.zoom],
        autoPanOnNodeDrag: store.autoPanOnNodeDrag,
        nodesDraggable: store.nodesDraggable,
        selectNodesOnDrag: store.selectNodesOnDrag,
        nodeDragThreshold: store.nodeDragThreshold,
        unselectNodesAndEdges: store.unselectNodesAndEdges,
        updateNodePositions: store.updateNodePositions,
        onSelectionDrag: store.onselectiondrag,
        onSelectionDragStart: store.onselectiondragstart,
        onSelectionDragStop: store.onselectiondragstop,
        panBy: store.panBy
      };
    }
  });

  return {
    update(params: DragHandlerParams) {
      if (params.disabled) {
        dragInstance.destroy();
        return;
      }

      dragInstance.update({
        domNode: params.domNode,
        noDragClassName: params.noDragClass,
        handleSelector: params.handleSelector,
        nodeId: params.nodeId,
        isSelectable: params.isSelectable,
        nodeClickDistance: params.nodeClickDistance
      });
    },
    destroy() {
      dragInstance.destroy();
    }
  };
}
