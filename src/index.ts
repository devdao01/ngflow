// main component
export { NgFlowComponent } from './lib/container/ng-flow/ng-flow.component';
export * from './lib/container/ng-flow/types';

// components
export { PanelComponent } from './lib/container/panel/panel.component';
export { NgFlowProviderComponent } from './lib/components/provider/ng-flow-provider.component';
export { ViewportPortalComponent } from './lib/components/viewport-portal/viewport-portal.component';
export {
  BaseEdgeComponent,
  BezierEdgeComponent,
  StepEdgeComponent,
  SmoothStepEdgeComponent,
  StraightEdgeComponent
} from './lib/components/edges';
export { HandleComponent } from './lib/components/handle/handle.component';
export { EdgeLabelComponent } from './lib/components/edge-label/edge-label.component';
export { EdgeReconnectAnchorComponent } from './lib/components/edge-reconnect-anchor/edge-reconnect-anchor.component';

// plugins
export { ControlsComponent } from './lib/plugins/controls/controls.component';
export { ControlButtonComponent } from './lib/plugins/controls/control-button.component';
export { BackgroundComponent, BackgroundVariant } from './lib/plugins/background/background.component';
export { MinimapComponent, type GetMiniMapNodeAttribute } from './lib/plugins/minimap/minimap.component';
export { NodeToolbarComponent } from './lib/plugins/node-toolbar/node-toolbar.component';
export { EdgeToolbarComponent } from './lib/plugins/edge-toolbar/edge-toolbar.component';
export { NodeResizerComponent } from './lib/plugins/node-resizer/node-resizer.component';
export { ResizeControlComponent } from './lib/plugins/node-resizer/resize-control.component';

// store
export { useStore, injectStoreGetter } from './lib/hooks/use-store';
export { injectStore, FLOW_STORE_CONTEXT, NODE_ID, EDGE_ID, NODE_CONNECTABLE } from './lib/store/context';

// utils
export * from './lib/utils';

// hooks
export * from './lib/hooks/use-ng-flow';
export * from './lib/hooks/hooks';

// directives
export { FlowPortalDirective } from './lib/directives/portal.directive';

// types
export type {
  Edge,
  EdgeProps,
  BaseEdgeProps,
  BezierEdgeProps,
  SmoothStepEdgeProps,
  StepEdgeProps,
  StraightEdgeProps,
  EdgeTypes,
  DefaultEdgeOptions,
  BuiltInEdge,
  EdgeLayouted
} from './lib/types/edges';
export type * from './lib/types/general';
export type { Node, NodeTypes, BuiltInNode, NodeProps, InternalNode } from './lib/types/nodes';
export type * from './lib/types/events';
export type { ClassValue, StyleValue, DomAttributes } from './lib/types/utils';
export type { NgFlowStore, FlowStoreActions, StoreContext, ProviderContext } from './lib/store/types';

// system types
export {
  type Align,
  type SmoothStepPathOptions,
  type BezierPathOptions,
  ConnectionLineType,
  type EdgeMarker,
  type EdgeMarkerType,
  MarkerType,
  type OnMove,
  type OnMoveStart,
  type OnMoveEnd,
  type Connection,
  ConnectionMode,
  type OnConnectStartParams,
  type OnConnectStart,
  type OnConnect,
  type OnConnectEnd,
  type Viewport,
  type SnapGrid,
  PanOnScrollMode,
  type ViewportHelperFunctionOptions,
  type SetCenterOptions,
  type FitBoundsOptions,
  type PanelPosition,
  type ProOptions,
  SelectionMode,
  type SelectionRect,
  type OnError,
  type NodeOrigin,
  Position,
  type XYPosition,
  type XYZPosition,
  type Dimensions,
  type Rect,
  type Box,
  type Transform,
  type CoordinateExtent,
  type ColorMode,
  type ColorModeClass,
  type ShouldResize,
  type OnResizeStart,
  type OnResize,
  type OnResizeEnd,
  type OnReconnect,
  type OnReconnectStart,
  type OnReconnectEnd,
  type ControlPosition,
  type ControlLinePosition,
  ResizeControlVariant,
  type ResizeParams,
  type ResizeParamsWithDirection,
  type ResizeDragEvent,
  type NodeConnection,
  type AriaLabelConfig,
  type SetCenter,
  type SetViewport,
  type FitBounds,
  type HandleConnection,
  type HandleType,
  type ZIndexMode,
  type NodeHandle,
  type UseNodeConnectionsParams
} from '@xyflow/system';

// system utils
export {
  type GetBezierPathParams,
  getBezierEdgeCenter,
  getBezierPath,
  getEdgeCenter,
  type GetSmoothStepPathParams,
  getSmoothStepPath,
  type GetStraightPathParams,
  getStraightPath,
  getViewportForBounds,
  getNodesBounds,
  getIncomers,
  getOutgoers,
  getConnectedEdges
} from '@xyflow/system';
