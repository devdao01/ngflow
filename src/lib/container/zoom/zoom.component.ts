import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input
} from '@angular/core';
import {
  PanOnScrollMode,
  XYPanZoom,
  type OnMove,
  type OnMoveStart,
  type OnMoveEnd,
  type PanZoomInstance,
  type Transform
} from '@xyflow/system';

import { injectStore } from '../../store';

@Component({
  selector: 'ng-flow-zoom',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    class: 'ng-flow__zoom ng-flow__container'
  }
})
export class ZoomComponent implements OnDestroy {
  readonly panOnScrollMode = input<PanOnScrollMode>(PanOnScrollMode.Free);
  readonly preventScrolling = input<boolean>(true);
  readonly zoomOnScroll = input<boolean>(true);
  readonly zoomOnDoubleClick = input<boolean>(true);
  readonly zoomOnPinch = input<boolean>(true);
  readonly panOnScroll = input<boolean>(false);
  readonly panOnScrollSpeed = input<number>(0.5);
  readonly panOnDrag = input<boolean | number[]>(true);
  readonly paneClickDistance = input<number>(1);
  readonly selectionOnDrag = input<boolean>(false);
  readonly onmovestart = input<OnMoveStart | undefined>(undefined);
  readonly onmove = input<OnMove | undefined>(undefined);
  readonly onmoveend = input<OnMoveEnd | undefined>(undefined);
  readonly oninit = input<(() => void) | undefined>(undefined);

  protected store = injectStore();
  private element = inject(ElementRef).nativeElement as HTMLDivElement;

  private panOnDragActive = computed(() => this.store.panActivationKeyPressed || this.panOnDrag());
  private panOnScrollActive = computed(() => this.store.panActivationKeyPressed || this.panOnScroll());

  private panZoomInstance: PanZoomInstance;
  private onInitCalled = false;

  constructor() {
    const store = this.store;
    // We extract the initial value
    const initialViewport = store.viewport;

    this.panZoomInstance = XYPanZoom({
      domNode: this.element,
      minZoom: store.minZoom,
      maxZoom: store.maxZoom,
      translateExtent: store.translateExtent,
      viewport: initialViewport,
      onPanZoom: (event, viewport) => this.onmove()?.(event, viewport),
      onPanZoomStart: (event, viewport) => this.onmovestart()?.(event, viewport),
      onPanZoomEnd: (event, viewport) => this.onmoveend()?.(event, viewport),
      onDraggingChange: (dragging: boolean) => {
        store.dragging = dragging;
      }
    });

    const viewport = this.panZoomInstance.getViewport();
    if (
      initialViewport.x !== viewport.x ||
      initialViewport.y !== viewport.y ||
      initialViewport.zoom !== viewport.zoom
    ) {
      this.onTransformChange([viewport.x, viewport.y, viewport.zoom]);
    }

    store.panZoom = this.panZoomInstance;

    effect(() => {
      this.panZoomInstance.update({
        lib: 'ng',
        zoomOnScroll: this.zoomOnScroll(),
        zoomOnDoubleClick: this.zoomOnDoubleClick(),
        zoomOnPinch: this.zoomOnPinch(),
        panOnScroll: this.panOnScrollActive(),
        panOnDrag: this.panOnDragActive(),
        panOnScrollSpeed: this.panOnScrollSpeed(),
        panOnScrollMode: this.panOnScrollMode(),
        zoomActivationKeyPressed: store.zoomActivationKeyPressed,
        preventScrolling: typeof this.preventScrolling() === 'boolean' ? this.preventScrolling() : true,
        noPanClassName: store.noPanClass,
        noWheelClassName: store.noWheelClass,
        userSelectionActive: !!store.selectionRect,
        paneClickDistance: this.paneClickDistance(),
        selectionOnDrag: this.selectionOnDrag(),
        onTransformChange: (transform: Transform) => this.onTransformChange(transform),
        connectionInProgress: store.connection.inProgress
      });
    });

    effect(() => {
      if (!this.onInitCalled && store.viewportInitialized) {
        this.oninit()?.();
        this.onInitCalled = true;
      }
    });
  }

  private onTransformChange = (transform: Transform) => {
    this.store.viewport = { x: transform[0], y: transform[1], zoom: transform[2] };
  };

  ngOnDestroy() {
    this.panZoomInstance.destroy();
    this.store.panZoom = null;
  }
}
