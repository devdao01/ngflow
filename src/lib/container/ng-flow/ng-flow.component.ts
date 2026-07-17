import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  model,
  untracked,
  type Type
} from '@angular/core';
import {
  ConnectionLineType,
  PanOnScrollMode,
  type AriaLabelConfig,
  type ColorMode,
  type ConnectionMode,
  type CoordinateExtent,
  type NodeOrigin,
  type OnConnect,
  type OnConnectEnd,
  type OnConnectStart,
  type OnError,
  type OnMove,
  type OnMoveEnd,
  type OnMoveStart,
  type OnReconnect,
  type OnReconnectEnd,
  type OnReconnectStart,
  type PanelPosition,
  type ProOptions,
  type SelectionMode,
  type SnapGrid,
  type Viewport,
  type ZIndexMode
} from '@xyflow/system';

import { createStore } from '../../store';
import { FLOW_STORE_CONTEXT } from '../../store/context';
import type { NgFlowStore, ProviderContext, StoreContext } from '../../store/types';
import { cc, toPxString } from '../../utils';

import { ZoomComponent } from '../zoom/zoom.component';
import { PaneComponent } from '../pane/pane.component';
import { ViewportComponent } from '../viewport/viewport.component';
import { NodeRendererComponent } from '../node-renderer/node-renderer.component';
import { EdgeRendererComponent } from '../edge-renderer/edge-renderer.component';
import { NodeSelectionComponent } from '../../components/node-selection/node-selection.component';
import { SelectionComponent } from '../../components/selection/selection.component';
import { KeyHandlerComponent } from '../../components/key-handler/key-handler.component';
import { ConnectionLineComponent } from '../../components/connection-line/connection-line.component';
import { AttributionComponent } from '../../components/attribution/attribution.component';
import { A11yDescriptionsComponent } from '../../components/a11y/a11y-descriptions.component';

import type {
  ClassValue,
  DefaultEdgeOptions,
  Edge,
  EdgeTypes,
  FitViewOptions,
  IsValidConnection,
  KeyDefinition,
  Node,
  NodeEventWithPointer,
  NodeTargetEventWithPointer,
  NodeTypes,
  NodesEventWithPointer,
  OnBeforeConnect,
  OnBeforeDelete,
  OnBeforeReconnect,
  OnDelete,
  OnSelectionChange,
  OnSelectionDrag,
  StyleValue
} from '../../types';

@Component({
  selector: 'ng-flow',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KeyHandlerComponent,
    ZoomComponent,
    PaneComponent,
    ViewportComponent,
    EdgeRendererComponent,
    ConnectionLineComponent,
    NodeRendererComponent,
    NodeSelectionComponent,
    SelectionComponent,
    AttributionComponent,
    A11yDescriptionsComponent
  ],
  providers: [
    {
      provide: FLOW_STORE_CONTEXT,
      useExisting: forwardRef(() => NgFlowComponent)
    }
  ],
  template: `
    <ng-flow-key-handler
      [selectionKey]="selectionKey()"
      [deleteKey]="deleteKey()"
      [panActivationKey]="panActivationKey()"
      [multiSelectionKey]="multiSelectionKey()"
      [zoomActivationKey]="zoomActivationKey()"
    />
    <ng-flow-zoom
      [panOnScrollMode]="panOnScrollMode()"
      [preventScrolling]="preventScrolling()"
      [zoomOnScroll]="zoomOnScroll()"
      [zoomOnDoubleClick]="zoomOnDoubleClick()"
      [zoomOnPinch]="zoomOnPinch()"
      [panOnScroll]="panOnScroll()"
      [panOnScrollSpeed]="panOnScrollSpeed()"
      [panOnDrag]="panOnDrag()"
      [paneClickDistance]="paneClickDistance()"
      [selectionOnDrag]="selectionOnDrag()"
      [onmovestart]="onmovestart()"
      [onmove]="onmove()"
      [onmoveend]="onmoveend()"
      [oninit]="oninit()"
    >
      <ng-flow-pane
        [onpaneclick]="onpaneclick()"
        [onpanecontextmenu]="onpanecontextmenu()"
        [onselectionstart]="onselectionstart()"
        [onselectionend]="onselectionend()"
        [panOnDrag]="panOnDrag()"
        [paneClickDistance]="paneClickDistance()"
        [selectionOnDrag]="selectionOnDrag()"
        [autoPanOnSelection]="autoPanOnSelection()"
      >
        <ng-flow-viewport>
          <div class="ng-flow__viewport-back ng-flow__container"></div>
          <ng-flow-edge-renderer
            [onedgeclick]="onedgeclick()"
            [onedgecontextmenu]="onedgecontextmenu()"
            [onedgepointerenter]="onedgepointerenter()"
            [onedgepointerleave]="onedgepointerleave()"
          />
          <div class="ng-flow__edge-labels ng-flow__container"></div>
          <ng-flow-connection-line
            [type]="connectionLineType()"
            [lineComponent]="connectionLineComponent()"
            [containerStyle]="connectionLineContainerStyle()"
            [style]="connectionLineStyle()"
          />
          <ng-flow-node-renderer
            [nodeClickDistance]="nodeClickDistance()"
            [onnodeclick]="onnodeclick()"
            [onnodecontextmenu]="onnodecontextmenu()"
            [onnodepointerenter]="onnodepointerenter()"
            [onnodepointermove]="onnodepointermove()"
            [onnodepointerleave]="onnodepointerleave()"
            [onnodedrag]="onnodedrag()"
            [onnodedragstart]="onnodedragstart()"
            [onnodedragstop]="onnodedragstop()"
          />
          <ng-flow-node-selection
            [onselectionclick]="onselectionclick()"
            [onselectioncontextmenu]="onselectioncontextmenu()"
            [onnodedrag]="onnodedrag()"
            [onnodedragstart]="onnodedragstart()"
            [onnodedragstop]="onnodedragstop()"
          />
          <div class="ng-flow__viewport-front ng-flow__container"></div>
        </ng-flow-viewport>
        <ng-flow-selection
          [isVisible]="userSelectionVisible()"
          [width]="store.selectionRect?.width ?? 0"
          [height]="store.selectionRect?.height ?? 0"
          [x]="store.selectionRect?.x ?? 0"
          [y]="store.selectionRect?.y ?? 0"
        />
      </ng-flow-pane>
    </ng-flow-zoom>
    <ng-flow-attribution [proOptions]="proOptions()" [position]="attributionPosition() ?? 'bottom-right'" />
    <ng-flow-a11y-descriptions />
    <ng-content />
  `,
  styles: `
    :host {
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
      z-index: 0;
      display: block;
    }
  `,
  host: {
    '[class]': 'hostClasses()',
    '[style]': 'style()',
    '[style.width]': 'widthPx()',
    '[style.height]': 'heightPx()',
    'data-testid': 'ng-flow__wrapper',
    role: 'application',
    '(scroll)': 'onScroll($event)'
  }
})
export class NgFlowComponent<NodeType extends Node = Node, EdgeType extends Edge = Edge>
  implements StoreContext<NodeType, EdgeType>, OnInit, OnDestroy
{
  // two-way bindable models
  readonly nodes = model<NodeType[]>([]);
  readonly edges = model<EdgeType[]>([]);
  readonly viewport = model<Viewport | undefined>(undefined);

  // props consumed by the component tree directly
  readonly width = input<number | undefined>(undefined);
  readonly height = input<number | undefined>(undefined);
  readonly class = input<ClassValue>();
  readonly style = input<StyleValue | undefined>(undefined);
  readonly proOptions = input<ProOptions | undefined>(undefined);
  readonly selectionKey = input<KeyDefinition | KeyDefinition[] | null | undefined>(undefined);
  readonly deleteKey = input<KeyDefinition | KeyDefinition[] | null | undefined>(undefined);
  readonly panActivationKey = input<KeyDefinition | KeyDefinition[] | null | undefined>(undefined);
  readonly multiSelectionKey = input<KeyDefinition | KeyDefinition[] | null | undefined>(undefined);
  readonly zoomActivationKey = input<KeyDefinition | KeyDefinition[] | null | undefined>(undefined);
  readonly paneClickDistance = input<number>(1);
  readonly nodeClickDistance = input<number>(1);
  readonly onmovestart = input<OnMoveStart | undefined>(undefined);
  readonly onmoveend = input<OnMoveEnd | undefined>(undefined);
  readonly onmove = input<OnMove | undefined>(undefined);
  readonly oninit = input<(() => void) | undefined>(undefined);
  readonly onnodeclick = input<NodeEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodecontextmenu = input<NodeEventWithPointer<MouseEvent, NodeType>>();
  readonly onnodedrag = input<NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodedragstart = input<NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodedragstop = input<NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodepointerenter = input<NodeEventWithPointer<PointerEvent, NodeType>>();
  readonly onnodepointermove = input<NodeEventWithPointer<PointerEvent, NodeType>>();
  readonly onnodepointerleave = input<NodeEventWithPointer<PointerEvent, NodeType>>();
  readonly onselectionclick = input<NodesEventWithPointer<MouseEvent, NodeType>>();
  readonly onselectioncontextmenu = input<NodesEventWithPointer<MouseEvent, NodeType>>();
  readonly onselectionstart = input<((event: PointerEvent) => void) | undefined>(undefined);
  readonly onselectionend = input<((event: PointerEvent) => void) | undefined>(undefined);
  readonly onedgeclick = input<({ edge, event }: { edge: EdgeType; event: MouseEvent }) => void>();
  readonly onedgecontextmenu = input<({ edge, event }: { edge: EdgeType; event: MouseEvent }) => void>();
  readonly onedgepointerenter = input<({ edge, event }: { edge: EdgeType; event: PointerEvent }) => void>();
  readonly onedgepointerleave = input<({ edge, event }: { edge: EdgeType; event: PointerEvent }) => void>();
  readonly onpaneclick = input<(({ event }: { event: MouseEvent }) => void) | undefined>(undefined);
  readonly onpanecontextmenu = input<(({ event }: { event: MouseEvent }) => void) | undefined>(undefined);
  readonly panOnScrollMode = input<PanOnScrollMode>(PanOnScrollMode.Free);
  readonly preventScrolling = input<boolean>(true);
  readonly zoomOnScroll = input<boolean>(true);
  readonly zoomOnDoubleClick = input<boolean>(true);
  readonly zoomOnPinch = input<boolean>(true);
  readonly panOnScroll = input<boolean>(false);
  readonly panOnScrollSpeed = input<number>(0.5);
  readonly panOnDrag = input<boolean | number[]>(true);
  readonly selectionOnDrag = input<boolean>(false);
  readonly autoPanOnSelection = input<boolean>(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly connectionLineComponent = input<Type<any> | undefined>(undefined);
  readonly connectionLineStyle = input<StyleValue | undefined>(undefined);
  readonly connectionLineContainerStyle = input<StyleValue | undefined>(undefined);
  readonly connectionLineType = input<ConnectionLineType>(ConnectionLineType.Bezier);
  readonly attributionPosition = input<PanelPosition | undefined>(undefined);

  // props consumed by the store (must structurally satisfy PropSignals<FlowRestProps>)
  readonly id = input<string | undefined>(undefined);
  readonly nodeTypes = input<NodeTypes | undefined>(undefined);
  readonly edgeTypes = input<EdgeTypes | undefined>(undefined);
  readonly fitView = input<boolean | undefined>(undefined);
  readonly fitViewOptions = input<FitViewOptions<NodeType> | undefined>(undefined);
  readonly nodeOrigin = input<NodeOrigin | undefined>(undefined);
  readonly nodeDragThreshold = input<number | undefined>(undefined);
  readonly connectionDragThreshold = input<number | undefined>(undefined);
  readonly minZoom = input<number | undefined>(undefined);
  readonly maxZoom = input<number | undefined>(undefined);
  readonly initialViewport = input<Viewport | undefined>(undefined);
  readonly connectionRadius = input<number | undefined>(undefined);
  readonly connectionMode = input<ConnectionMode | undefined>(undefined);
  readonly selectionMode = input<SelectionMode | undefined>(undefined);
  readonly selectNodesOnDrag = input<boolean | undefined>(undefined);
  readonly snapGrid = input<SnapGrid | undefined>(undefined);
  readonly defaultMarkerColor = input<string | null | undefined>(undefined);
  readonly nodesDraggable = input<boolean | undefined>(undefined);
  readonly autoPanSpeed = input<number | undefined>(undefined);
  readonly autoPanOnNodeFocus = input<boolean | undefined>(undefined);
  readonly nodesConnectable = input<boolean | undefined>(undefined);
  readonly elementsSelectable = input<boolean | undefined>(undefined);
  readonly nodesFocusable = input<boolean | undefined>(undefined);
  readonly edgesFocusable = input<boolean | undefined>(undefined);
  readonly translateExtent = input<CoordinateExtent | undefined>(undefined);
  readonly nodeExtent = input<CoordinateExtent | undefined>(undefined);
  readonly onlyRenderVisibleElements = input<boolean | undefined>(undefined);
  readonly autoPanOnConnect = input<boolean | undefined>(undefined);
  readonly autoPanOnNodeDrag = input<boolean | undefined>(undefined);
  readonly defaultEdgeOptions = input<DefaultEdgeOptions | undefined>(undefined);
  readonly colorMode = input<ColorMode | undefined>(undefined);
  readonly colorModeSSR = input<Omit<ColorMode, 'system'> | undefined>(undefined);
  readonly elevateNodesOnSelect = input<boolean | undefined>(undefined);
  readonly elevateEdgesOnSelect = input<boolean | undefined>(undefined);
  readonly disableKeyboardA11y = input<boolean | undefined>(undefined);
  readonly noDragClass = input<string | undefined>(undefined);
  readonly noWheelClass = input<string | undefined>(undefined);
  readonly noPanClass = input<string | undefined>(undefined);
  readonly clickConnect = input<boolean | undefined>(undefined);
  readonly isValidConnection = input<IsValidConnection<EdgeType> | undefined>(undefined);
  readonly onflowerror = input<OnError | undefined>(undefined);
  readonly ondelete = input<OnDelete<NodeType, EdgeType> | undefined>(undefined);
  readonly onbeforedelete = input<OnBeforeDelete<NodeType, EdgeType> | undefined>(undefined);
  readonly onbeforeconnect = input<OnBeforeConnect<EdgeType> | undefined>(undefined);
  readonly onconnect = input<OnConnect | undefined>(undefined);
  readonly onconnectstart = input<OnConnectStart | undefined>(undefined);
  readonly onconnectend = input<OnConnectEnd | undefined>(undefined);
  readonly onreconnect = input<OnReconnect<EdgeType> | undefined>(undefined);
  readonly onreconnectstart = input<OnReconnectStart<EdgeType> | undefined>(undefined);
  readonly onreconnectend = input<OnReconnectEnd<NodeType, EdgeType> | undefined>(undefined);
  readonly onbeforereconnect = input<OnBeforeReconnect<EdgeType> | undefined>(undefined);
  readonly onclickconnectstart = input<OnConnectStart | undefined>(undefined);
  readonly onclickconnectend = input<OnConnectEnd | undefined>(undefined);
  readonly onselectionchange = input<OnSelectionChange<NodeType, EdgeType> | undefined>(undefined);
  readonly onselectiondragstart = input<OnSelectionDrag<NodeType> | undefined>(undefined);
  readonly onselectiondrag = input<OnSelectionDrag<NodeType> | undefined>(undefined);
  readonly onselectiondragstop = input<OnSelectionDrag<NodeType> | undefined>(undefined);
  readonly ariaLabelConfig = input<Partial<AriaLabelConfig> | undefined>(undefined);
  readonly zIndexMode = input<ZIndexMode | undefined>(undefined);

  private element = inject(ElementRef).nativeElement as HTMLDivElement;

  readonly store: NgFlowStore<NodeType, EdgeType> = createStore<NodeType, EdgeType>({
    // `this` satisfies PropSignals<FlowRestProps> structurally: one input signal per prop
    props: this,
    width: undefined,
    height: undefined,
    nodes: this.nodes,
    edges: this.edges,
    viewport: this.viewport
  });

  // StoreContext implementation (provided to children via FLOW_STORE_CONTEXT)
  readonly provider = false;
  getStore() {
    return this.store;
  }

  protected hostClasses = computed(() =>
    cc(['ng-flow', 'ng-flow__container', this.store.colorMode, this.class()])
  );
  protected widthPx = computed(() => toPxString(this.width()));
  protected heightPx = computed(() => toPxString(this.height()));
  protected userSelectionVisible = computed(
    () => !!(this.store.selectionRect && this.store.selectionRectMode === 'user')
  );

  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    // Set store for provider context (if the flow is wrapped in a NgFlowProvider)
    const providerContext = inject(FLOW_STORE_CONTEXT, { optional: true, skipSelf: true }) as
      | ProviderContext<NodeType, EdgeType>
      | null;
    if (providerContext && providerContext.setStore) {
      providerContext.setStore(this.store);
    }

    this.store.domNode = this.element;
    this.store.width = this.width() ?? this.element.clientWidth;
    this.store.height = this.height() ?? this.element.clientHeight;

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.store.width = this.element.clientWidth;
        this.store.height = this.element.clientHeight;
      });
      this.resizeObserver.observe(this.element);
    }

    // handle selection change
    effect(() => {
      const params = { nodes: this.store.selectedNodes, edges: this.store.selectedEdges };
      untracked(() => this.onselectionchange())?.(params);
      for (const handler of this.store.selectionChangeHandlers.values()) {
        handler(params);
      }
    });
  }

  ngOnInit() {
    // Inputs are only available after construction (unlike Svelte props),
    // so initial one-shot values are captured here, before the first render.
    if (this.fitView() !== undefined) {
      this.store.fitViewQueued = this.fitView() ?? false;
    }
    if (this.fitViewOptions() !== undefined) {
      this.store.fitViewOptions = this.fitViewOptions();
    }
    if (this.width() !== undefined) {
      this.store.width = this.width()!;
    }
    if (this.height() !== undefined) {
      this.store.height = this.height()!;
    }
    if (this.initialViewport() !== undefined && !this.fitView()) {
      this.store.viewport = this.initialViewport()!;
    }
  }

  protected onScroll(event: Event) {
    // Undo scroll events, preventing viewport from shifting when nodes outside of it are focused
    (event.currentTarget as HTMLDivElement).scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.store.reset();
    this.store.domNode = null;
  }
}
