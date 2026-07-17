import type { Type } from '@angular/core';
import type {
  ConnectionLineType,
  NodeOrigin,
  Viewport,
  SelectionMode,
  SnapGrid,
  OnMoveStart,
  OnMove,
  OnMoveEnd,
  CoordinateExtent,
  PanOnScrollMode,
  OnError,
  ConnectionMode,
  PanelPosition,
  ProOptions,
  ColorMode,
  OnConnect,
  OnConnectStart,
  OnConnectEnd,
  OnReconnect,
  OnReconnectStart,
  OnReconnectEnd,
  AriaLabelConfig,
  ZIndexMode
} from '@xyflow/system';

import type {
  Edge,
  Node,
  NodeTypes,
  KeyDefinition,
  EdgeTypes,
  DefaultEdgeOptions,
  FitViewOptions,
  OnDelete,
  OnBeforeConnect,
  OnBeforeDelete,
  IsValidConnection,
  OnBeforeReconnect,
  OnSelectionChange,
  ClassValue,
  StyleValue
} from '../../types';

import type {
  EdgeEvents,
  NodeEvents,
  NodeSelectionEvents,
  OnSelectionDrag,
  PaneEvents
} from '../../types/events';

/**
 * Props accepted by the NgFlow component (port of SvelteFlowProps).
 * `nodes`, `edges` and `viewport` are two-way bindable models.
 */
export type NgFlowProps<NodeType extends Node = Node, EdgeType extends Edge = Edge> = NodeEvents<NodeType> &
  NodeSelectionEvents<NodeType> &
  EdgeEvents<EdgeType> &
  PaneEvents & {
    /** The id of the flow. This is necessary if you want to render multiple flows. */
    id?: string;
    /** Sets a fixed width for the flow */
    width?: number;
    /** Sets a fixed height for the flow */
    height?: number;
    /** An array of nodes to render in a flow. */
    nodes?: NodeType[];
    /** An array of edges to render in a flow. */
    edges?: EdgeType[];
    /** Custom node types to be available in a flow. */
    nodeTypes?: NodeTypes;
    /** Custom edge types to be available in a flow. */
    edgeTypes?: EdgeTypes;
    /** Pressing down this key you can select multiple elements with a selection box.
     * @default 'Shift'
     */
    selectionKey?: KeyDefinition | KeyDefinition[] | null;
    /** If a key is set, you can pan the viewport while that key is held down even if panOnScroll is set to false.
     * @default 'Space'
     */
    panActivationKey?: KeyDefinition | KeyDefinition[] | null;
    /** Pressing down this key deletes all selected nodes & edges.
     * @default 'Backspace'
     */
    deleteKey?: KeyDefinition | KeyDefinition[] | null;
    /** Pressing down this key you can select multiple elements by clicking.
     * @default 'Meta' for macOS, "Ctrl" for other systems
     */
    multiSelectionKey?: KeyDefinition | KeyDefinition[] | null;
    /** If a key is set, you can zoom the viewport while that key is held down even if panOnScroll is set to false.
     * @default 'Meta' for macOS, "Ctrl" for other systems
     */
    zoomActivationKey?: KeyDefinition | KeyDefinition[] | null;
    /** If set, initial viewport will show all nodes & edges */
    fitView?: boolean;
    /** Options to be used in combination with fitView */
    fitViewOptions?: FitViewOptions<NodeType>;
    /** Defines nodes relative position to its coordinates
     * @default [0, 0]
     */
    nodeOrigin?: NodeOrigin;
    /** With a threshold greater than zero you can control the distinction between node drag and click events.
     * @default 1
     */
    nodeDragThreshold?: number;
    /** Distance that the mouse can move between mousedown/up that will trigger a click
     * @default 0
     */
    paneClickDistance?: number;
    /** Distance that the mouse can move between mousedown/up that will trigger a click
     * @default 0
     */
    nodeClickDistance?: number;
    /** The threshold in pixels that the mouse must move before a connection line starts to drag.
     * @default 1
     */
    connectionDragThreshold?: number;
    /** Minimum zoom level
     * @default 0.5
     */
    minZoom?: number;
    /** Maximum zoom level
     * @default 2
     */
    maxZoom?: number;
    /** Sets the initial position and zoom of the viewport. */
    initialViewport?: Viewport;
    /** Custom viewport to be used instead of internal one */
    viewport?: Viewport;
    /** The radius around a handle where you drop a connection line to create a new edge.
     * @default 20
     */
    connectionRadius?: number;
    /** 'strict' connection mode will only allow you to connect source handles to target handles.
     * @default 'strict'
     */
    connectionMode?: ConnectionMode;
    /** Provide a custom component to be used instead of the default connection line */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectionLineComponent?: Type<any>;
    /** Styles to be applied to the connection line */
    connectionLineStyle?: StyleValue;
    /** Styles to be applied to the container of the connection line */
    connectionLineContainerStyle?: StyleValue;
    /** When set to "partial", when the user creates a selection box by click and dragging
     * nodes that are only partially in the box are still selected.
     * @default 'full'
     */
    selectionMode?: SelectionMode;
    /** Controls if nodes should be automatically selected when being dragged */
    selectNodesOnDrag?: boolean;
    /** Grid all nodes will snap to
     * @example [20, 20]
     */
    snapGrid?: SnapGrid;
    /** Color of edge markers
     * @example "#b1b1b7"
     */
    defaultMarkerColor?: string | null;
    /** Controls if all nodes should be draggable
     * @default true
     */
    nodesDraggable?: boolean;
    /** The speed at which the viewport pans while dragging a node or a selection box.
     * @default 15
     */
    autoPanSpeed?: number;
    /** When `true`, the viewport will pan when a node is focused.
     * @default true
     */
    autoPanOnNodeFocus?: boolean;
    /** Controls if all nodes should be connectable to each other
     * @default true
     */
    nodesConnectable?: boolean;
    /** Controls if all elements should (nodes & edges) be selectable
     * @default true
     */
    elementsSelectable?: boolean;
    /** When `true`, focus between nodes can be cycled with the `Tab` key.
     * @default true
     */
    nodesFocusable?: boolean;
    /** When `true`, focus between edges can be cycled with the `Tab` key.
     * @default true
     */
    edgesFocusable?: boolean;
    /** By default the viewport extends infinitely. You can use this prop to set a boundary. */
    translateExtent?: CoordinateExtent;
    /** By default the nodes can be placed anywhere. You can use this prop to set a boundary. */
    nodeExtent?: CoordinateExtent;
    /** Disabling this prop will allow the user to scroll the page even when their pointer is over the flow.
     * @default true
     */
    preventScrolling?: boolean;
    /** Controls if the viewport should zoom by scrolling inside the container.
     * @default true
     */
    zoomOnScroll?: boolean;
    /** Controls if the viewport should zoom by double clicking somewhere on the flow
     * @default true
     */
    zoomOnDoubleClick?: boolean;
    /** Controls if the viewport should zoom by pinching on a touch screen
     * @default true
     */
    zoomOnPinch?: boolean;
    /** Controls if the viewport should pan by scrolling inside the container
     * @default false
     */
    panOnScroll?: boolean;
    /** Controls how fast viewport should be panned on scroll.
     * @default 0.5
     */
    panOnScrollSpeed?: number;
    /** This prop is used to limit the direction of panning when panOnScroll is enabled.
     * @default "free"
     */
    panOnScrollMode?: PanOnScrollMode;
    /** Enabling this prop allows users to pan the viewport by clicking and dragging.
     * @default true
     */
    panOnDrag?: boolean | number[];
    /** Select multiple elements with a selection box, without pressing down selectionKey.
     * @default false
     */
    selectionOnDrag?: boolean;
    /** You can enable this optimisation to instruct the flow to only render nodes and edges that would be visible in the viewport.
     * @default false
     */
    onlyRenderVisibleElements?: boolean;
    /** You can enable this prop to automatically pan the viewport while making a new connection.
     * @default true
     */
    autoPanOnConnect?: boolean;
    /** You can enable this prop to automatically pan the viewport while dragging a node.
     * @default true
     */
    autoPanOnNodeDrag?: boolean;
    /** When `true`, the viewport will pan automatically when the cursor moves to the edge of the
     * viewport while creating a selection box.
     * @default true
     */
    autoPanOnSelection?: boolean;
    /** Defaults to be applied to all new edges that are added to the flow. */
    defaultEdgeOptions?: DefaultEdgeOptions;
    /** Controls color scheme used for styling the flow
     * @default 'system'
     */
    colorMode?: ColorMode;
    /** Fallback color mode for SSR if colorMode is set to 'system' */
    colorModeSSR?: Omit<ColorMode, 'system'>;
    /** Class to be applied to the flow container */
    class?: ClassValue;
    /** Styles to be applied to the flow container */
    style?: StyleValue;
    /** Choose from the built-in edge types to be used for connections
     * @default 'default' | ConnectionLineType.Bezier
     */
    connectionLineType?: ConnectionLineType;
    /** Enabling this option will raise the z-index of nodes when they are selected.
     * @default true
     */
    elevateNodesOnSelect?: boolean;
    /** Enabling this option will raise the z-index of edges when they are selected.
     * @default true
     */
    elevateEdgesOnSelect?: boolean;
    /** You can use this prop to disable keyboard accessibility features.
     * @default false
     */
    disableKeyboardA11y?: boolean;
    /** Class name that prevents node dragging.
     * @default "nodrag"
     */
    noDragClass?: string;
    /** Class name that prevents zoom on wheel.
     * @default "nowheel"
     */
    noWheelClass?: string;
    /** Class name that prevents panning.
     * @default "nopan"
     */
    noPanClass?: string;
    /** Toggles ability to make connections via clicking the handles */
    clickConnect?: boolean;
    /** Set position of the attribution
     * @default 'bottom-right'
     */
    attributionPosition?: PanelPosition;
    /** By default, we render a small attribution in the corner of your flows. */
    proOptions?: ProOptions;
    isValidConnection?: IsValidConnection<EdgeType>;
    /** This event handler is called when the user begins to pan or zoom the viewport */
    onmovestart?: OnMoveStart;
    /** This event handler is called when the user pans or zooms the viewport */
    onmove?: OnMove;
    /** This event handler is called when the user stops panning or zooming the viewport */
    onmoveend?: OnMoveEnd;
    /** Called when an internal error occurs. */
    onflowerror?: OnError;
    /** This handler gets called when the user deletes nodes or edges. */
    ondelete?: OnDelete<NodeType, EdgeType>;
    /** This handler gets called before the user deletes nodes or edges. */
    onbeforedelete?: OnBeforeDelete<NodeType, EdgeType>;
    /** This handler gets called when a new edge is created. */
    onbeforeconnect?: OnBeforeConnect<EdgeType>;
    /** This event gets fired when a connection successfully completes and an edge is created. */
    onconnect?: OnConnect;
    /** When a user starts to drag a connection line, this event gets fired. */
    onconnectstart?: OnConnectStart;
    /** When a user stops dragging a connection line, this event gets fired. */
    onconnectend?: OnConnectEnd;
    /** This event gets fired when after an edge was reconnected */
    onreconnect?: OnReconnect<EdgeType>;
    /** This event gets fired when a user starts to reconnect an edge */
    onreconnectstart?: OnReconnectStart<EdgeType>;
    /** This event gets fired when a user stops reconnecting an edge */
    onreconnectend?: OnReconnectEnd<NodeType, EdgeType>;
    /** This handler gets called when an edge is reconnected. */
    onbeforereconnect?: OnBeforeReconnect<EdgeType>;
    /** A connection is started by clicking on a handle */
    onclickconnectstart?: OnConnectStart;
    /** A connection is finished by clicking on a handle */
    onclickconnectend?: OnConnectEnd;
    /** This handler gets called when the flow is finished initializing */
    oninit?: () => void;
    /** This event handler gets called when the selected nodes & edges change */
    onselectionchange?: OnSelectionChange<NodeType, EdgeType>;
    /** This event handler gets called when a user starts to drag a selection box. */
    onselectiondragstart?: OnSelectionDrag<NodeType>;
    /** This event handler gets called when a user drags a selection box. */
    onselectiondrag?: OnSelectionDrag<NodeType>;
    /** This event handler gets called when a user stops dragging a selection box. */
    onselectiondragstop?: OnSelectionDrag<NodeType>;
    /** This event handler gets called when the user starts to drag a selection box */
    onselectionstart?: (event: PointerEvent) => void;
    /** This event handler gets called when the user finishes dragging a selection box */
    onselectionend?: (event: PointerEvent) => void;
    /** Configuration for customizable labels, descriptions, and UI text. */
    ariaLabelConfig?: Partial<AriaLabelConfig>;
    /** Used to define how z-indexing is calculated for nodes and edges.
     * @default 'basic'
     */
    zIndexMode?: ZIndexMode;
  };
