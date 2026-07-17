import type { Signal, WritableSignal } from '@angular/core';
import type {
  InternalNodeUpdate,
  XYPosition,
  ViewportHelperFunctionOptions,
  Connection,
  UpdateNodePositions,
  CoordinateExtent,
  UpdateConnection,
  Viewport,
  SetCenter
} from '@xyflow/system';

import type { FlowStore } from './initial-store';
import type { Node, Edge, NodeTypes, EdgeTypes, FitViewOptions, InternalNode } from '../types';
import type { NgFlowProps } from '../container/ng-flow/types';

export type FlowStoreActions<NodeType extends Node = Node, EdgeType extends Edge = Edge> = {
  setNodeTypes: (nodeTypes: NodeTypes) => void;
  setEdgeTypes: (edgeTypes: EdgeTypes) => void;
  addEdge: (edge: EdgeType | Connection) => void;
  zoomIn: (options?: ViewportHelperFunctionOptions) => Promise<boolean>;
  zoomOut: (options?: ViewportHelperFunctionOptions) => Promise<boolean>;
  setMinZoom: (minZoom: number) => void;
  setMaxZoom: (maxZoom: number) => void;
  setTranslateExtent: (extent: CoordinateExtent) => void;
  fitView: (options?: FitViewOptions<NodeType>) => Promise<boolean>;
  setCenter: SetCenter;
  updateNodePositions: UpdateNodePositions;
  updateNodeInternals: (updates: Map<string, InternalNodeUpdate>) => void;
  unselectNodesAndEdges: (params?: { nodes?: NodeType[]; edges?: EdgeType[] }) => void;
  addSelectedNodes: (ids: string[]) => void;
  addSelectedEdges: (ids: string[]) => void;
  handleNodeSelection: (id: string, unselect?: boolean, nodeRef?: HTMLDivElement | null) => void;
  handleEdgeSelection: (id: string) => void;
  moveSelectedNodes: (direction: XYPosition, factor: number) => void;
  panBy: (delta: XYPosition) => Promise<boolean>;
  updateConnection: UpdateConnection<InternalNode<NodeType>>;
  cancelConnection: () => void;
  reset(): void;
};

/**
 * Props that are handled by the store (everything except props consumed
 * directly by the NgFlow component tree). Mirrors SvelteFlowRestProps.
 */
export type FlowRestProps<NodeType extends Node = Node, EdgeType extends Edge = Edge> = Omit<
  NgFlowProps<NodeType, EdgeType>,
  | 'width'
  | 'height'
  | 'class'
  | 'style'
  | 'proOptions'
  | 'selectionKey'
  | 'deleteKey'
  | 'panActivationKey'
  | 'multiSelectionKey'
  | 'zoomActivationKey'
  | 'paneClickDistance'
  | 'nodeClickDistance'
  | 'onmovestart'
  | 'onmoveend'
  | 'onmove'
  | 'oninit'
  | 'onnodeclick'
  | 'onnodecontextmenu'
  | 'onnodedrag'
  | 'onnodedragstart'
  | 'onnodedragstop'
  | 'onnodepointerenter'
  | 'onnodepointermove'
  | 'onnodepointerleave'
  | 'onselectionclick'
  | 'onselectioncontextmenu'
  | 'onselectionstart'
  | 'onselectionend'
  | 'onedgeclick'
  | 'onedgecontextmenu'
  | 'onedgepointerenter'
  | 'onedgepointerleave'
  | 'onpaneclick'
  | 'onpanecontextmenu'
  | 'panOnScrollMode'
  | 'panOnScrollSpeed'
  | 'preventScrolling'
  | 'zoomOnScroll'
  | 'zoomOnDoubleClick'
  | 'zoomOnPinch'
  | 'panOnScroll'
  | 'panOnDrag'
  | 'selectionOnDrag'
  | 'autoPanOnSelection'
  | 'connectionLineComponent'
  | 'connectionLineStyle'
  | 'connectionLineContainerStyle'
  | 'connectionLineType'
  | 'attributionPosition'
  | 'nodes'
  | 'edges'
  | 'viewport'
>;

/**
 * A read-only signal view over a props object: one signal per prop.
 * The NgFlow component satisfies this structurally with its `input()` members.
 */
export type PropSignals<T> = {
  readonly [K in keyof Required<T>]: Signal<T[K] | undefined>;
};

export type StoreSignals<NodeType extends Node = Node, EdgeType extends Edge = Edge> = {
  props: PropSignals<FlowRestProps<NodeType, EdgeType>>;
  width?: number;
  height?: number;
  nodes: WritableSignal<NodeType[]>;
  edges: WritableSignal<EdgeType[]>;
  viewport: WritableSignal<Viewport | undefined>;
};

export type NgFlowStore<NodeType extends Node = Node, EdgeType extends Edge = Edge> = FlowStore<
  NodeType,
  EdgeType
> &
  FlowStoreActions<NodeType, EdgeType>;

export type StoreContext<NodeType extends Node = Node, EdgeType extends Edge = Edge> = {
  getStore: () => NgFlowStore<NodeType, EdgeType>;
  provider: boolean;
};

export type ProviderContext<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge
> = StoreContext<NodeType, EdgeType> & {
  setStore: (store: NgFlowStore<NodeType, EdgeType>) => void;
};
