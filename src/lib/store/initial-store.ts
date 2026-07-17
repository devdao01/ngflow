import { computed, linkedSignal, signal, type WritableSignal } from '@angular/core';
import {
  infiniteExtent,
  SelectionMode,
  ConnectionMode,
  createDevWarn,
  adoptUserNodes,
  getViewportForBounds,
  updateConnectionLookup,
  initialConnection,
  mergeAriaLabelConfig,
  type SelectionRect,
  type SnapGrid,
  type MarkerProps,
  type PanZoomInstance,
  type CoordinateExtent,
  type NodeOrigin,
  type OnError,
  type Viewport,
  type OnConnect,
  type OnConnectStart,
  type OnConnectEnd,
  type NodeLookup,
  type ConnectionState,
  getInternalNodesBounds,
  createMarkerIds,
  type EdgeLookup,
  type ConnectionLookup,
  type ParentLookup,
  pointToRendererPoint,
  type ColorModeClass,
  type Transform,
  fitViewport,
  type Handle,
  type OnReconnect,
  type OnReconnectStart,
  type OnReconnectEnd,
  type AriaLabelConfig,
  type ZIndexMode
} from '@xyflow/system';

import { DefaultNodeComponent } from '../components/nodes/default-node.component';
import { InputNodeComponent } from '../components/nodes/input-node.component';
import { OutputNodeComponent } from '../components/nodes/output-node.component';
import { GroupNodeComponent } from '../components/nodes/group-node.component';
import {
  BezierEdgeInternalComponent,
  SmoothStepEdgeInternalComponent,
  StraightEdgeInternalComponent,
  StepEdgeInternalComponent
} from '../components/edges';

import type {
  NodeTypes,
  EdgeTypes,
  FitViewOptions,
  OnDelete,
  OnBeforeConnect,
  OnBeforeDelete,
  IsValidConnection,
  Edge,
  Node,
  EdgeLayouted,
  InternalNode,
  OnBeforeReconnect,
  OnSelectionChange,
  OnSelectionDrag
} from '../types';

import type { StoreSignals } from './types';
import { MediaQuerySignal } from '../utils/media-query';
import { getLayoutedEdges, getVisibleNodes, type EdgeLayoutAllOptions } from './visible-elements';

const devWarn = createDevWarn('Ng Flow', 'https://github.com/xyflow/xyflow');

export const initialNodeTypes: NodeTypes = {
  input: InputNodeComponent,
  output: OutputNodeComponent,
  default: DefaultNodeComponent,
  group: GroupNodeComponent
};

export const initialEdgeTypes: EdgeTypes = {
  straight: StraightEdgeInternalComponent,
  smoothstep: SmoothStepEdgeInternalComponent,
  default: BezierEdgeInternalComponent,
  step: StepEdgeInternalComponent
};

function getInitialViewport<NodeType extends Node = Node>(
  // This is just used to make sure adoptUserNodes is called before we calculate the viewport
  _nodesInitialized: boolean,
  fitView: boolean | undefined,
  initialViewport: Viewport | undefined,
  width: number,
  height: number,
  nodeLookup: NodeLookup<InternalNode<NodeType>>
) {
  if (fitView && !initialViewport && width && height) {
    const bounds = getInternalNodesBounds(nodeLookup, {
      filter: (node) => !!((node.width || node.initialWidth) && (node.height || node.initialHeight))
    });
    return getViewportForBounds(bounds, width, height, 0.5, 2, 0.1);
  } else {
    return initialViewport ?? { x: 0, y: 0, zoom: 1 };
  }
}

/**
 * The reactive flow store. Mirrors SvelteFlowStore: every `$state.raw` became a
 * `signal`, every `$derived` a `computed` and every derived that actions assign
 * to became a `linkedSignal`. All fields are exposed through get/set accessors,
 * so ported code reads/writes them exactly like the Svelte original.
 */
export class FlowStore<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
  constructor(protected signals: StoreSignals<NodeType, EdgeType>) {
    this._width = signal(signals.width ?? 0);
    this._height = signal(signals.height ?? 0);
    this.fitViewQueued = signals.props.fitView() ?? false;
    this.fitViewOptions = signals.props.fitViewOptions();
    this._prefersDark = new MediaQuerySignal(
      '(prefers-color-scheme: dark)',
      signals.props.colorModeSSR() === 'dark'
    );
    this._viewport = signal(
      getInitialViewport(
        this.nodesInitialized,
        signals.props.fitView(),
        signals.props.initialViewport(),
        this.width,
        this.height,
        this.nodeLookup
      )
    );
  }

  private _flowId = computed(() => this.signals.props.id() ?? '1');
  get flowId() {
    return this._flowId();
  }

  private _domNode = signal<HTMLDivElement | null>(null);
  get domNode() {
    return this._domNode();
  }
  set domNode(value: HTMLDivElement | null) {
    this._domNode.set(value);
  }

  private _panZoom = signal<PanZoomInstance | null>(null);
  get panZoom() {
    return this._panZoom();
  }
  set panZoom(value: PanZoomInstance | null) {
    this._panZoom.set(value);
  }

  private _width: WritableSignal<number>;
  get width() {
    return this._width();
  }
  set width(value: number) {
    this._width.set(value);
  }

  private _height: WritableSignal<number>;
  get height() {
    return this._height();
  }
  set height(value: number) {
    this._height.set(value);
  }

  private _zIndexMode = linkedSignal<ZIndexMode>(() => this.signals.props.zIndexMode() ?? 'basic');
  get zIndexMode() {
    return this._zIndexMode();
  }
  set zIndexMode(value: ZIndexMode) {
    this._zIndexMode.set(value);
  }

  /** Bumped to re-run adoptUserNodes without touching the user's nodes binding. */
  private _adoptUserNodesTick = signal(0);
  retriggerAdoptUserNodes() {
    this._adoptUserNodesTick.update((tick) => tick + 1);
  }

  private _nodesInitialized = computed<boolean>(() => {
    this._adoptUserNodesTick();
    const { nodesInitialized } = adoptUserNodes(this.signals.nodes(), this.nodeLookup, this.parentLookup, {
      nodeExtent: this.nodeExtent,
      nodeOrigin: this.nodeOrigin,
      elevateNodesOnSelect: this.signals.props.elevateNodesOnSelect() ?? true,
      checkEquality: true,
      zIndexMode: this.zIndexMode
    });

    if (this.fitViewQueued && nodesInitialized) {
      /**
       * Similar to the Svelte original: resolving fitView sets state, which is
       * not allowed while computing a derived value, so we defer it.
       */
      queueMicrotask(() => {
        this.resolveFitView();
      });
    }

    return nodesInitialized;
  });
  get nodesInitialized() {
    return this._nodesInitialized();
  }

  private _viewportInitialized = computed(() => this.panZoom !== null);
  get viewportInitialized() {
    return this._viewportInitialized();
  }

  private _edges = computed<EdgeType[]>(() => {
    const edges = this.signals.edges();
    updateConnectionLookup(this.connectionLookup, this.edgeLookup, edges);
    return edges;
  });

  get nodes() {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.nodesInitialized;
    return this.signals.nodes();
  }
  set nodes(nodes: NodeType[]) {
    this.signals.nodes.set(nodes);
  }
  get edges() {
    return this._edges();
  }
  set edges(edges: EdgeType[]) {
    this.signals.edges.set(edges);
  }

  _prevSelectedNodes: NodeType[] = [];
  _prevSelectedNodeIds = new Set<string>();
  private _selectedNodes = computed(() => {
    const selectedNodesCount = this._prevSelectedNodeIds.size;
    const selectedNodeIds = new Set<string>();
    const selectedNodes = this.nodes.filter((node) => {
      if (node.selected) {
        selectedNodeIds.add(node.id);
        this._prevSelectedNodeIds.delete(node.id);
      }
      return node.selected;
    });

    // Either the number of selected nodes has changed or two nodes changed their selection state
    // at the same time. However then the previously selected node will be inside _prevSelectedNodeIds
    if (selectedNodesCount !== selectedNodeIds.size || this._prevSelectedNodeIds.size > 0) {
      this._prevSelectedNodes = selectedNodes;
    }

    this._prevSelectedNodeIds = selectedNodeIds;
    return this._prevSelectedNodes;
  });
  get selectedNodes() {
    return this._selectedNodes();
  }

  _prevSelectedEdges: EdgeType[] = [];
  _prevSelectedEdgeIds = new Set<string>();
  private _selectedEdges = computed(() => {
    const selectedEdgesCount = this._prevSelectedEdgeIds.size;
    const selectedEdgeIds = new Set<string>();
    const selectedEdges = this.edges.filter((edge) => {
      if (edge.selected) {
        selectedEdgeIds.add(edge.id);
        this._prevSelectedEdgeIds.delete(edge.id);
      }
      return edge.selected;
    });
    // Either the number of selected edges has changed or two edges changed their selection state
    // at the same time. However then the previously selected edge will be inside _prevSelectedEdgeIds
    if (selectedEdgesCount !== selectedEdgeIds.size || this._prevSelectedEdgeIds.size > 0) {
      this._prevSelectedEdges = selectedEdges;
    }
    this._prevSelectedEdgeIds = selectedEdgeIds;
    return this._prevSelectedEdges;
  });
  get selectedEdges() {
    return this._selectedEdges();
  }

  selectionChangeHandlers = new Map<symbol, OnSelectionChange<NodeType, EdgeType>>();

  nodeLookup: NodeLookup<InternalNode<NodeType>> = new Map();
  parentLookup: ParentLookup<InternalNode<NodeType>> = new Map();
  connectionLookup: ConnectionLookup = new Map();
  edgeLookup: EdgeLookup<EdgeType> = new Map();

  _prevVisibleEdges = new Map<string, EdgeLayouted<EdgeType>>();
  private _visible = computed(() => {
    const {
      // We need to access this.nodes to trigger on changes
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      nodes,
      edges,
      _prevVisibleEdges: previousEdges,
      nodeLookup,
      connectionMode,
      onerror,
      onlyRenderVisibleElements,
      defaultEdgeOptions,
      zIndexMode
    } = this;

    let visibleNodes: Map<string, InternalNode<NodeType>>;
    let visibleEdges: Map<string, EdgeLayouted<EdgeType>>;

    const options = {
      edges,
      defaultEdgeOptions,
      previousEdges,
      nodeLookup,
      connectionMode,
      elevateEdgesOnSelect: this.signals.props.elevateEdgesOnSelect() ?? true,
      zIndexMode,
      onerror
    };

    if (onlyRenderVisibleElements) {
      // We only subscribe to viewport, width, height if onlyRenderVisibleElements is true
      const { viewport, width, height } = this;
      const transform: Transform = [viewport.x, viewport.y, viewport.zoom];

      visibleNodes = getVisibleNodes(nodeLookup, transform, width, height);
      visibleEdges = getLayoutedEdges({
        ...options,
        onlyRenderVisible: true,
        visibleNodes,
        transform,
        width,
        height
      });
    } else {
      visibleNodes = this.nodeLookup;
      visibleEdges = getLayoutedEdges(options as unknown as EdgeLayoutAllOptions<NodeType, EdgeType>);
    }

    return {
      nodes: visibleNodes,
      edges: visibleEdges
    };
  });
  get visible() {
    return this._visible();
  }

  private _nodesDraggable = linkedSignal(() => this.signals.props.nodesDraggable() ?? true);
  get nodesDraggable() {
    return this._nodesDraggable();
  }
  set nodesDraggable(value: boolean) {
    this._nodesDraggable.set(value);
  }

  private _nodesConnectable = linkedSignal(() => this.signals.props.nodesConnectable() ?? true);
  get nodesConnectable() {
    return this._nodesConnectable();
  }
  set nodesConnectable(value: boolean) {
    this._nodesConnectable.set(value);
  }

  private _elementsSelectable = linkedSignal(() => this.signals.props.elementsSelectable() ?? true);
  get elementsSelectable() {
    return this._elementsSelectable();
  }
  set elementsSelectable(value: boolean) {
    this._elementsSelectable.set(value);
  }

  private _nodesFocusable = computed(() => this.signals.props.nodesFocusable() ?? true);
  get nodesFocusable() {
    return this._nodesFocusable();
  }

  private _edgesFocusable = computed(() => this.signals.props.edgesFocusable() ?? true);
  get edgesFocusable() {
    return this._edgesFocusable();
  }

  private _disableKeyboardA11y = computed(() => this.signals.props.disableKeyboardA11y() ?? false);
  get disableKeyboardA11y() {
    return this._disableKeyboardA11y();
  }

  private _minZoom = linkedSignal(() => this.signals.props.minZoom() ?? 0.5);
  get minZoom() {
    return this._minZoom();
  }
  set minZoom(value: number) {
    this._minZoom.set(value);
  }

  private _maxZoom = linkedSignal(() => this.signals.props.maxZoom() ?? 2);
  get maxZoom() {
    return this._maxZoom();
  }
  set maxZoom(value: number) {
    this._maxZoom.set(value);
  }

  private _nodeOrigin = computed<NodeOrigin>(() => this.signals.props.nodeOrigin() ?? [0, 0]);
  get nodeOrigin() {
    return this._nodeOrigin();
  }

  private _nodeExtent = computed<CoordinateExtent>(() => this.signals.props.nodeExtent() ?? infiniteExtent);
  get nodeExtent() {
    return this._nodeExtent();
  }

  private _translateExtent = linkedSignal<CoordinateExtent>(
    () => this.signals.props.translateExtent() ?? infiniteExtent
  );
  get translateExtent() {
    return this._translateExtent();
  }
  set translateExtent(value: CoordinateExtent) {
    this._translateExtent.set(value);
  }

  private _defaultEdgeOptions = computed<Partial<Edge>>(() => this.signals.props.defaultEdgeOptions() ?? {});
  get defaultEdgeOptions() {
    return this._defaultEdgeOptions();
  }

  private _nodeDragThreshold = computed(() => this.signals.props.nodeDragThreshold() ?? 1);
  get nodeDragThreshold() {
    return this._nodeDragThreshold();
  }

  private _autoPanOnNodeDrag = computed(() => this.signals.props.autoPanOnNodeDrag() ?? true);
  get autoPanOnNodeDrag() {
    return this._autoPanOnNodeDrag();
  }

  private _autoPanOnConnect = computed(() => this.signals.props.autoPanOnConnect() ?? true);
  get autoPanOnConnect() {
    return this._autoPanOnConnect();
  }

  private _autoPanOnNodeFocus = computed(() => this.signals.props.autoPanOnNodeFocus() ?? true);
  get autoPanOnNodeFocus() {
    return this._autoPanOnNodeFocus();
  }

  private _autoPanSpeed = computed(() => this.signals.props.autoPanSpeed() ?? 15);
  get autoPanSpeed() {
    return this._autoPanSpeed();
  }

  private _connectionDragThreshold = computed(() => this.signals.props.connectionDragThreshold() ?? 1);
  get connectionDragThreshold() {
    return this._connectionDragThreshold();
  }

  fitViewQueued: boolean;
  fitViewOptions: FitViewOptions<NodeType> | undefined;
  fitViewResolver: PromiseWithResolvers<boolean> | null = null;

  private _snapGrid = computed<SnapGrid | null>(() => this.signals.props.snapGrid() ?? null);
  get snapGrid() {
    return this._snapGrid();
  }

  private _dragging = signal(false);
  get dragging() {
    return this._dragging();
  }
  set dragging(value: boolean) {
    this._dragging.set(value);
  }

  private _selectionRect = signal<SelectionRect | null>(null);
  get selectionRect() {
    return this._selectionRect();
  }
  set selectionRect(value: SelectionRect | null) {
    this._selectionRect.set(value);
  }

  private _selectionKeyPressed = signal(false);
  get selectionKeyPressed() {
    return this._selectionKeyPressed();
  }
  set selectionKeyPressed(value: boolean) {
    this._selectionKeyPressed.set(value);
  }

  private _multiselectionKeyPressed = signal(false);
  get multiselectionKeyPressed() {
    return this._multiselectionKeyPressed();
  }
  set multiselectionKeyPressed(value: boolean) {
    this._multiselectionKeyPressed.set(value);
  }

  private _deleteKeyPressed = signal(false);
  get deleteKeyPressed() {
    return this._deleteKeyPressed();
  }
  set deleteKeyPressed(value: boolean) {
    this._deleteKeyPressed.set(value);
  }

  private _panActivationKeyPressed = signal(false);
  get panActivationKeyPressed() {
    return this._panActivationKeyPressed();
  }
  set panActivationKeyPressed(value: boolean) {
    this._panActivationKeyPressed.set(value);
  }

  private _zoomActivationKeyPressed = signal(false);
  get zoomActivationKeyPressed() {
    return this._zoomActivationKeyPressed();
  }
  set zoomActivationKeyPressed(value: boolean) {
    this._zoomActivationKeyPressed.set(value);
  }

  private _selectionRectMode = signal<string | null>(null);
  get selectionRectMode() {
    return this._selectionRectMode();
  }
  set selectionRectMode(value: string | null) {
    this._selectionRectMode.set(value);
  }

  private _ariaLiveMessage = signal('');
  get ariaLiveMessage() {
    return this._ariaLiveMessage();
  }
  set ariaLiveMessage(value: string) {
    this._ariaLiveMessage.set(value);
  }

  private _selectionMode = computed<SelectionMode>(
    () => this.signals.props.selectionMode() ?? SelectionMode.Partial
  );
  get selectionMode() {
    return this._selectionMode();
  }

  private _nodeTypes = linkedSignal<NodeTypes>(() => ({
    ...initialNodeTypes,
    ...this.signals.props.nodeTypes()
  }));
  get nodeTypes() {
    return this._nodeTypes();
  }
  set nodeTypes(value: NodeTypes) {
    this._nodeTypes.set(value);
  }

  private _edgeTypes = linkedSignal<EdgeTypes>(() => ({
    ...initialEdgeTypes,
    ...this.signals.props.edgeTypes()
  }));
  get edgeTypes() {
    return this._edgeTypes();
  }
  set edgeTypes(value: EdgeTypes) {
    this._edgeTypes.set(value);
  }

  private _noPanClass = computed(() => this.signals.props.noPanClass() ?? 'nopan');
  get noPanClass() {
    return this._noPanClass();
  }

  private _noDragClass = computed(() => this.signals.props.noDragClass() ?? 'nodrag');
  get noDragClass() {
    return this._noDragClass();
  }

  private _noWheelClass = computed(() => this.signals.props.noWheelClass() ?? 'nowheel');
  get noWheelClass() {
    return this._noWheelClass();
  }

  private _ariaLabelConfig = computed<AriaLabelConfig>(() =>
    mergeAriaLabelConfig(this.signals.props.ariaLabelConfig())
  );
  get ariaLabelConfig() {
    return this._ariaLabelConfig();
  }

  // _viewport is the internal viewport.
  // when binding to viewport, we operate on signals.viewport instead
  private _viewport: WritableSignal<Viewport>;
  get viewport() {
    return this.signals.viewport() ?? this._viewport();
  }
  set viewport(newViewport: Viewport) {
    if (this.signals.viewport()) {
      this.signals.viewport.set(newViewport);
    }
    this._viewport.set(newViewport);
  }

  // _connection is viewport independent and originating from XYHandle
  private _rawConnection = signal<ConnectionState<InternalNode<NodeType>>>(initialConnection);
  get _connection() {
    return this._rawConnection();
  }
  set _connection(value: ConnectionState<InternalNode<NodeType>>) {
    this._rawConnection.set(value);
  }

  // We derive a viewport dependent connection here
  private _connectionDerived = linkedSignal<ConnectionState<InternalNode<NodeType>>>(() => {
    const connection = this._rawConnection();
    if (!connection.inProgress) {
      return connection;
    }

    return {
      ...connection,
      to: pointToRendererPoint(connection.to, [this.viewport.x, this.viewport.y, this.viewport.zoom])
    };
  });
  get connection() {
    return this._connectionDerived();
  }
  set connection(value: ConnectionState<InternalNode<NodeType>>) {
    this._connectionDerived.set(value);
  }

  private _connectionMode = computed<ConnectionMode>(
    () => this.signals.props.connectionMode() ?? ConnectionMode.Strict
  );
  get connectionMode() {
    return this._connectionMode();
  }

  private _connectionRadius = computed(() => this.signals.props.connectionRadius() ?? 20);
  get connectionRadius() {
    return this._connectionRadius();
  }

  private _isValidConnection = computed<IsValidConnection<EdgeType>>(
    () => this.signals.props.isValidConnection() ?? (() => true)
  );
  get isValidConnection() {
    return this._isValidConnection();
  }

  private _selectNodesOnDrag = computed(() => this.signals.props.selectNodesOnDrag() ?? true);
  get selectNodesOnDrag() {
    return this._selectNodesOnDrag();
  }

  private _defaultMarkerColor = computed<string | null>(() =>
    this.signals.props.defaultMarkerColor() === undefined
      ? '#b1b1b7'
      : (this.signals.props.defaultMarkerColor() as string | null)
  );
  get defaultMarkerColor() {
    return this._defaultMarkerColor();
  }

  private _markers = computed<MarkerProps[]>(() =>
    createMarkerIds(this.signals.edges(), {
      defaultColor: this.defaultMarkerColor,
      id: this.flowId,
      defaultMarkerStart: this.defaultEdgeOptions.markerStart,
      defaultMarkerEnd: this.defaultEdgeOptions.markerEnd
    })
  );
  get markers() {
    return this._markers();
  }

  private _onlyRenderVisibleElements = computed(() => this.signals.props.onlyRenderVisibleElements() ?? false);
  get onlyRenderVisibleElements() {
    return this._onlyRenderVisibleElements();
  }

  private _onerror = computed<OnError>(() => this.signals.props.onflowerror() ?? devWarn);
  get onerror() {
    return this._onerror();
  }

  get ondelete(): OnDelete<NodeType, EdgeType> | undefined {
    return this.signals.props.ondelete();
  }
  get onbeforedelete(): OnBeforeDelete<NodeType, EdgeType> | undefined {
    return this.signals.props.onbeforedelete();
  }

  get onbeforeconnect(): OnBeforeConnect<EdgeType> | undefined {
    return this.signals.props.onbeforeconnect();
  }
  get onconnect(): OnConnect | undefined {
    return this.signals.props.onconnect();
  }
  get onconnectstart(): OnConnectStart | undefined {
    return this.signals.props.onconnectstart();
  }
  get onconnectend(): OnConnectEnd | undefined {
    return this.signals.props.onconnectend();
  }

  get onbeforereconnect(): OnBeforeReconnect<EdgeType> | undefined {
    return this.signals.props.onbeforereconnect();
  }
  get onreconnect(): OnReconnect<EdgeType> | undefined {
    return this.signals.props.onreconnect();
  }
  get onreconnectstart(): OnReconnectStart<EdgeType> | undefined {
    return this.signals.props.onreconnectstart();
  }
  get onreconnectend(): OnReconnectEnd<NodeType, EdgeType> | undefined {
    return this.signals.props.onreconnectend();
  }

  private _clickConnect = computed(() => this.signals.props.clickConnect() ?? true);
  get clickConnect() {
    return this._clickConnect();
  }

  get onclickconnectstart(): OnConnectStart | undefined {
    return this.signals.props.onclickconnectstart();
  }
  get onclickconnectend(): OnConnectEnd | undefined {
    return this.signals.props.onclickconnectend();
  }

  private _clickConnectStartHandle = signal<Pick<Handle, 'id' | 'nodeId' | 'type'> | null>(null);
  get clickConnectStartHandle() {
    return this._clickConnectStartHandle();
  }
  set clickConnectStartHandle(value: Pick<Handle, 'id' | 'nodeId' | 'type'> | null) {
    this._clickConnectStartHandle.set(value);
  }

  get onselectiondrag(): OnSelectionDrag<NodeType> | undefined {
    return this.signals.props.onselectiondrag();
  }
  get onselectiondragstart(): OnSelectionDrag<NodeType> | undefined {
    return this.signals.props.onselectiondragstart();
  }
  get onselectiondragstop(): OnSelectionDrag<NodeType> | undefined {
    return this.signals.props.onselectiondragstop();
  }

  resolveFitView = async () => {
    if (!this.panZoom) {
      return;
    }

    await fitViewport(
      {
        nodes: this.nodeLookup,
        width: this.width,
        height: this.height,
        panZoom: this.panZoom,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom
      },
      this.fitViewOptions
    );

    this.fitViewResolver?.resolve(true);
    /**
     * wait for the fitViewport to resolve before deleting the resolver,
     * we want to reuse the old resolver if the user calls fitView again in the mean time
     */
    this.fitViewQueued = false;
    this.fitViewOptions = undefined;
    this.fitViewResolver = null;
  };

  private _prefersDark: MediaQuerySignal;
  private _colorMode = computed<ColorModeClass>(() => {
    const colorMode = this.signals.props.colorMode();
    return colorMode === 'system'
      ? this._prefersDark.current
        ? 'dark'
        : 'light'
      : ((colorMode ?? 'light') as ColorModeClass);
  });
  get colorMode() {
    return this._colorMode();
  }

  resetStoreValues() {
    this.dragging = false;
    this.selectionRect = null;
    this.selectionRectMode = null;
    this.selectionKeyPressed = false;
    this.multiselectionKeyPressed = false;
    this.deleteKeyPressed = false;
    this.panActivationKeyPressed = false;
    this.zoomActivationKeyPressed = false;
    this._connection = initialConnection;
    this.clickConnectStartHandle = null;
    this.viewport = this.signals.props.initialViewport() ?? { x: 0, y: 0, zoom: 1 };
    this.ariaLiveMessage = '';
  }
}

export function getInitialStore<NodeType extends Node = Node, EdgeType extends Edge = Edge>(
  signals: StoreSignals<NodeType, EdgeType>
) {
  return new FlowStore<NodeType, EdgeType>(signals);
}
