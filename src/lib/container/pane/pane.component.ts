import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input
} from '@angular/core';
import {
  SelectionMode,
  getEventPosition,
  getNodesInside,
  calcAutoPan,
  pointToRendererPoint,
  rendererPointToPoint,
  type XYPosition
} from '@xyflow/system';

import { injectStore } from '../../store';
import { cc } from '../../utils';
import type { Node, Edge } from '../../types';

export function toggleSelected<Item extends Node | Edge>(ids: Set<string>) {
  return (item: Item) => {
    const isSelected = ids.has(item.id);

    if (!!item.selected !== isSelected) {
      return { ...item, selected: isSelected };
    }

    return item;
  };
}

function isSetEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) {
    return false;
  }

  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }

  return true;
}

@Component({
  selector: 'ng-flow-pane',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    '[class]': 'classes()',
    '(click)': 'onClickWrapped($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel($event)',
    '(contextmenu)': 'onContextMenuWrapped($event)'
  }
})
export class PaneComponent implements OnDestroy {
  readonly panOnDrag = input<boolean | number[]>(true);
  readonly paneClickDistance = input<number>(1);
  readonly selectionOnDrag = input<boolean>(false);
  readonly autoPanOnSelection = input<boolean>(true);
  readonly onpaneclick = input<(({ event }: { event: MouseEvent }) => void) | undefined>(undefined);
  readonly onpanecontextmenu = input<(({ event }: { event: MouseEvent }) => void) | undefined>(undefined);
  readonly onselectionstart = input<((event: PointerEvent) => void) | undefined>(undefined);
  readonly onselectionend = input<((event: PointerEvent) => void) | undefined>(undefined);

  protected store = injectStore();
  private container = inject(ElementRef).nativeElement as HTMLDivElement;

  private containerBounds: DOMRect | null = null;
  private connectionEndedOnPane = false;

  private selectedNodeIds: Set<string> = new Set();
  private selectedEdgeIds: Set<string> = new Set();

  private panOnDragActive = computed(() => this.store.panActivationKeyPressed || this.panOnDrag());
  private isSelecting = computed(
    () =>
      this.store.selectionKeyPressed ||
      !!this.store.selectionRect ||
      (this.selectionOnDrag() && this.panOnDragActive() !== true)
  );
  private isSelectionEnabled = computed(
    () => this.store.elementsSelectable && (this.isSelecting() || this.store.selectionRectMode === 'user')
  );

  protected classes = computed(() => {
    const panOnDrag = this.panOnDrag();
    return cc([
      'ng-flow__pane',
      'ng-flow__container',
      {
        draggable: panOnDrag === true || (Array.isArray(panOnDrag) && panOnDrag.includes(0)),
        dragging: this.store.dragging,
        selection: this.isSelecting()
      }
    ]);
  });

  // Used to prevent click events when the user lets go of the selectionKey during a selection
  private selectionInProgress = false;

  // Used for auto pan when approaching the edges of the container during selection
  private autoPanId = 0;
  private position: XYPosition = { x: 0, y: 0 };
  private autoPanStarted = false;

  private onPointerDownCapture = (event: PointerEvent) => {
    if (!this.isSelectionEnabled()) {
      return;
    }
    const store = this.store;
    this.containerBounds = this.container.getBoundingClientRect();
    if (!this.containerBounds) return;

    const eventTargetIsContainer = event.target === this.container;

    const isNoKeyEvent = !eventTargetIsContainer && !!(event.target as HTMLElement).closest('.nokey');

    const isSelectionActive = (this.selectionOnDrag() && eventTargetIsContainer) || store.selectionKeyPressed;

    if (isNoKeyEvent || !this.isSelecting() || !isSelectionActive || event.button !== 0 || !event.isPrimary) {
      return;
    }

    (event.target as Partial<Element>)?.setPointerCapture?.(event.pointerId);

    this.selectionInProgress = false;
    this.autoPanStarted = false;

    const { x, y } = getEventPosition(event, this.containerBounds);

    // We convert the position to the flow space so that it stays fixed on the canvas while auto-panning
    const userSelectionFlowOrigin = pointToRendererPoint({ x, y }, [
      store.viewport.x,
      store.viewport.y,
      store.viewport.zoom
    ]);

    store.selectionRect = {
      width: 0,
      height: 0,
      startX: userSelectionFlowOrigin.x,
      startY: userSelectionFlowOrigin.y,
      x,
      y
    };

    if (!eventTargetIsContainer) {
      event.stopPropagation();
      event.preventDefault();
    }
  };

  private onClickCapture = (event: MouseEvent) => {
    if (!this.isSelectionEnabled()) {
      return;
    }
    if (this.selectionInProgress) {
      event.stopPropagation();
      this.selectionInProgress = false;
    }
  };

  constructor() {
    // Svelte uses capture-phase handlers, which Angular host listeners cannot express
    this.container.addEventListener('pointerdown', this.onPointerDownCapture, { capture: true });
    this.container.addEventListener('click', this.onClickCapture, { capture: true });
  }

  // We commit the user selection rectangle to the store on auto-panning or pointer move
  private commitUserSelectionRect(mouseX: number, mouseY: number): void {
    const store = this.store;
    if (store.selectionRect?.startX === undefined || store.selectionRect.startY === undefined) {
      return;
    }

    const userStartPosition = { x: store.selectionRect.startX, y: store.selectionRect.startY };
    const screenStart = rendererPointToPoint(userStartPosition, [
      store.viewport.x,
      store.viewport.y,
      store.viewport.zoom
    ]);
    const nextUserSelectRect = {
      startX: userStartPosition.x,
      startY: userStartPosition.y,
      x: mouseX < screenStart.x ? mouseX : screenStart.x,
      y: mouseY < screenStart.y ? mouseY : screenStart.y,
      width: Math.abs(mouseX - screenStart.x),
      height: Math.abs(mouseY - screenStart.y)
    };

    const prevSelectedNodeIds = this.selectedNodeIds;
    const prevSelectedEdgeIds = this.selectedEdgeIds;

    this.selectedNodeIds = new Set(
      getNodesInside(
        store.nodeLookup,
        nextUserSelectRect,
        [store.viewport.x, store.viewport.y, store.viewport.zoom],
        store.selectionMode === SelectionMode.Partial,
        true
      ).map((n) => n.id)
    );

    const edgesSelectable = store.defaultEdgeOptions.selectable ?? true;
    this.selectedEdgeIds = new Set();

    // We look for all edges connected to the selected nodes
    for (const nodeId of this.selectedNodeIds) {
      const connections = store.connectionLookup.get(nodeId);
      if (!connections) continue;
      for (const { edgeId } of connections.values()) {
        const edge = store.edgeLookup.get(edgeId);
        if (edge && (edge.selectable ?? edgesSelectable)) {
          this.selectedEdgeIds.add(edgeId);
        }
      }
    }

    // this prevents unnecessary updates while updating the selection rectangle
    if (!isSetEqual(prevSelectedNodeIds, this.selectedNodeIds)) {
      store.nodes = store.nodes.map(toggleSelected(this.selectedNodeIds));
    }

    if (!isSetEqual(prevSelectedEdgeIds, this.selectedEdgeIds)) {
      store.edges = store.edges.map(toggleSelected(this.selectedEdgeIds));
    }

    store.selectionRectMode = 'user';
    store.selectionRect = nextUserSelectRect;
  }

  private autoPan = (): void => {
    if (!this.autoPanOnSelection() || !this.containerBounds) {
      return;
    }
    const [x, y] = calcAutoPan(this.position, this.containerBounds, this.store.autoPanSpeed);

    this.store.panBy({ x, y }).then((panned) => {
      if (!this.selectionInProgress || !panned) {
        this.autoPanId = requestAnimationFrame(this.autoPan);
        return;
      }
      this.commitUserSelectionRect(this.position.x, this.position.y);
      this.autoPanId = requestAnimationFrame(this.autoPan);
    });
  };

  private cleanupAutoPan(): void {
    cancelAnimationFrame(this.autoPanId);
    this.autoPanId = 0;
    this.autoPanStarted = false;
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      this.cleanupAutoPan();
    }
    this.container.removeEventListener('pointerdown', this.onPointerDownCapture, { capture: true });
    this.container.removeEventListener('click', this.onClickCapture, { capture: true });
  }

  protected onPointerMove(event: PointerEvent) {
    if (!this.isSelectionEnabled()) {
      return;
    }
    const store = this.store;
    if (!this.isSelecting() || !this.containerBounds || !store.selectionRect) {
      return;
    }

    const mousePos = getEventPosition(event, this.containerBounds);
    this.position = { x: mousePos.x, y: mousePos.y };

    const userStartPosition = { x: store.selectionRect.startX ?? 0, y: store.selectionRect.startY ?? 0 };
    const screenStart = rendererPointToPoint(userStartPosition, [
      store.viewport.x,
      store.viewport.y,
      store.viewport.zoom
    ]);

    if (!this.selectionInProgress) {
      const requiredDistance = store.selectionKeyPressed ? 0 : this.paneClickDistance();
      const distance = Math.hypot(mousePos.x - screenStart.x, mousePos.y - screenStart.y);
      if (distance <= requiredDistance) {
        return;
      }
      store.unselectNodesAndEdges();
      this.onselectionstart()?.(event);
    }

    this.selectionInProgress = true;

    if (!this.autoPanStarted) {
      this.autoPan();
      this.autoPanStarted = true;
    }

    this.commitUserSelectionRect(mousePos.x, mousePos.y);
  }

  protected onPointerUp(event: PointerEvent) {
    const store = this.store;
    if (!this.isSelectionEnabled()) {
      if (event.target === this.container && store.connection.inProgress) {
        this.connectionEndedOnPane = true;
      }
      return;
    }

    if (event.button !== 0) {
      return;
    }

    (event.target as Partial<Element>)?.releasePointerCapture?.(event.pointerId);

    // We only want to trigger click functions when in selection mode if
    // the user did not move the mouse.
    if (!this.selectionInProgress && event.target === this.container) {
      this.onClick(event);
    }

    store.selectionRect = null;

    if (this.selectionInProgress) {
      store.selectionRectMode = this.selectedNodeIds.size > 0 ? 'nodes' : null;
      this.onselectionend()?.(event);
    }

    this.cleanupAutoPan();
  }

  protected onPointerCancel(event: PointerEvent) {
    if (!this.isSelectionEnabled()) {
      return;
    }
    (event.target as Partial<Element>)?.releasePointerCapture?.(event.pointerId);
    this.cleanupAutoPan();
  }

  protected onContextMenuWrapped(event: MouseEvent) {
    if (event.target !== this.container) {
      return;
    }
    const panOnDragActive = this.panOnDragActive();
    if (Array.isArray(panOnDragActive) && panOnDragActive.includes(2)) {
      event.preventDefault();
      return;
    }

    this.onpanecontextmenu()?.({ event });
  }

  protected onClickWrapped(event: MouseEvent) {
    if (this.isSelectionEnabled()) {
      return;
    }
    if (event.target !== this.container) {
      return;
    }
    this.onClick(event);
  }

  private onClick(event: MouseEvent) {
    const store = this.store;
    // We prevent click events when the user let go of the selectionKey during a selection
    // We also prevent click events when a connection is in progress
    if (this.selectionInProgress || store.connection.inProgress || this.connectionEndedOnPane) {
      this.selectionInProgress = false;
      this.connectionEndedOnPane = false;
      return;
    }

    this.onpaneclick()?.({ event });
    store.unselectNodesAndEdges();
    store.selectionRectMode = null;
    store.selectionRect = null;
  }
}
