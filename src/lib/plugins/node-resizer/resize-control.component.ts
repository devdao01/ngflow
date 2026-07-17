import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input
} from '@angular/core';
import {
  XYResizer,
  ResizeControlVariant,
  type ControlPosition,
  type ResizeControlDirection,
  type ShouldResize,
  type OnResizeStart,
  type OnResize,
  type OnResizeEnd,
  type XYResizerInstance,
  type XYResizerChange,
  type XYResizerChildChange
} from '@xyflow/system';

import { injectStore } from '../../store';
import { injectNodeId } from '../../store/context';
import type { ClassValue, StyleValue } from '../../types';
import { cc } from '../../utils';

@Component({
  selector: 'ng-flow-resize-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    '[class]': 'classes()',
    '[style]': 'style()',
    '[style.border-color]': 'isLineVariant() ? color() : null',
    '[style.background-color]': 'isLineVariant() ? null : color()',
    '[style.scale]': 'scale()'
  }
})
export class ResizeControlComponent implements OnInit, OnDestroy {
  readonly nodeId = input<string | undefined>(undefined);
  readonly position = input<ControlPosition | undefined>(undefined);
  readonly variant = input<ResizeControlVariant>(ResizeControlVariant.Handle);
  readonly color = input<string | undefined>(undefined);
  readonly minWidth = input<number>(10);
  readonly minHeight = input<number>(10);
  readonly maxWidth = input<number>(Number.MAX_VALUE);
  readonly maxHeight = input<number>(Number.MAX_VALUE);
  readonly keepAspectRatio = input<boolean>(false);
  readonly resizeDirection = input<ResizeControlDirection | undefined>(undefined);
  readonly autoScale = input<boolean>(true);
  readonly shouldResize = input<ShouldResize | undefined>(undefined);
  readonly onResizeStart = input<OnResizeStart | undefined>(undefined);
  readonly onResize = input<OnResize | undefined>(undefined);
  readonly onResizeEnd = input<OnResizeEnd | undefined>(undefined);
  readonly class = input<ClassValue>();
  readonly style = input<StyleValue | undefined>(undefined);

  protected store = injectStore();
  private contextNodeId = injectNodeId();
  private element = inject(ElementRef).nativeElement as HTMLDivElement;

  private id = computed(() => {
    const nodeId = this.nodeId();
    return typeof nodeId === 'string' ? nodeId : this.contextNodeId;
  });

  protected isLineVariant = computed(() => this.variant() === ResizeControlVariant.Line);

  private controlPosition = computed<ControlPosition>(() => {
    const defaultPosition = (this.isLineVariant() ? 'right' : 'bottom-right') as ControlPosition;
    return this.position() ?? defaultPosition;
  });

  protected classes = computed(() =>
    cc([
      'ng-flow__resize-control',
      this.store.noDragClass,
      ...this.controlPosition().split('-'),
      this.variant(),
      this.class()
    ])
  );

  protected scale = computed(() =>
    this.isLineVariant() || !this.autoScale() ? undefined : Math.max(1 / this.store.viewport.zoom, 1)
  );

  private resizer: XYResizerInstance | null = null;

  constructor() {
    effect(() => {
      this.resizer?.update({
        controlPosition: this.controlPosition(),
        boundaries: {
          minWidth: this.minWidth(),
          minHeight: this.minHeight(),
          maxWidth: this.maxWidth(),
          maxHeight: this.maxHeight()
        },
        keepAspectRatio: !!this.keepAspectRatio(),
        resizeDirection: this.resizeDirection(),
        onResizeStart: this.onResizeStart(),
        onResize: this.onResize(),
        onResizeEnd: this.onResizeEnd(),
        shouldResize: this.shouldResize()
      });
    });
  }

  ngOnInit() {
    const store = this.store;
    const id = this.id();

    if (!id) {
      throw new Error('Either pass a nodeId or use within a Custom Node component');
    }

    this.resizer = XYResizer({
      domNode: this.element,
      nodeId: id,
      getStoreItems: () => {
        return {
          nodeLookup: store.nodeLookup,
          transform: [store.viewport.x, store.viewport.y, store.viewport.zoom],
          snapGrid: store.snapGrid ?? undefined,
          snapToGrid: !!store.snapGrid,
          nodeOrigin: store.nodeOrigin,
          paneDomNode: store.domNode
        };
      },
      onChange: (change: XYResizerChange, childChanges: XYResizerChildChange[]) => {
        const changes = new Map<string, XYResizerChange>();
        changes.set(id, change);

        for (const childChange of childChanges) {
          changes.set(childChange.id, { x: childChange.position.x, y: childChange.position.y });
        }

        const resizeDirection = this.resizeDirection();
        store.nodes = store.nodes.map((node) => {
          const change = changes.get(node.id);
          const horizontal = !resizeDirection || resizeDirection === 'horizontal';
          const vertical = !resizeDirection || resizeDirection === 'vertical';

          if (change) {
            return {
              ...node,
              position: {
                x: horizontal ? (change.x ?? node.position.x) : node.position.x,
                y: vertical ? (change.y ?? node.position.y) : node.position.y
              },
              width: horizontal ? (change.width ?? node.width) : node.width,
              height: vertical ? (change.height ?? node.height) : node.height
            };
          }
          return node;
        });
      }
    });

    this.resizer.update({
      controlPosition: this.controlPosition(),
      boundaries: {
        minWidth: this.minWidth(),
        minHeight: this.minHeight(),
        maxWidth: this.maxWidth(),
        maxHeight: this.maxHeight()
      },
      keepAspectRatio: !!this.keepAspectRatio(),
      resizeDirection: this.resizeDirection(),
      onResizeStart: this.onResizeStart(),
      onResize: this.onResize(),
      onResizeEnd: this.onResizeEnd(),
      shouldResize: this.shouldResize()
    });
  }

  ngOnDestroy() {
    this.resizer?.destroy();
  }
}
