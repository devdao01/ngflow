import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  viewChild
} from '@angular/core';
import { getInternalNodesBounds, isNumeric, type Rect } from '@xyflow/system';

import { createDragHandler } from '../../directives/drag';
import { injectStore } from '../../store';
import { arrowKeyDiffs, toPxString } from '../../utils';
import { SelectionComponent } from '../selection/selection.component';
import type { Node, NodesEventWithPointer, NodeTargetEventWithPointer } from '../../types';

@Component({
  selector: 'ng-flow-node-selection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectionComponent],
  template: `
    @if (isActive()) {
      <div
        #wrapper
        [class]="wrapperClasses()"
        [style.width]="widthPx()"
        [style.height]="heightPx()"
        [style.transform]="transform()"
        [attr.role]="store.disableKeyboardA11y ? null : 'button'"
        [attr.tabindex]="store.disableKeyboardA11y ? null : -1"
        (contextmenu)="oncontextmenu($event)"
        (click)="onclick($event)"
        (keydown)="onkeydown($event)"
      >
        <ng-flow-selection width="100%" height="100%" [x]="0" [y]="0" />
      </div>
    }
  `,
  styles: `
    .ng-flow__selection-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2000;
      pointer-events: all;
    }

    .ng-flow__selection-wrapper:focus,
    .ng-flow__selection-wrapper:focus-visible {
      outline: none;
    }
  `
})
export class NodeSelectionComponent<NodeType extends Node = Node> implements OnDestroy {
  readonly onnodedrag = input<NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodedragstart = input<NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodedragstop = input<NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onselectionclick = input<NodesEventWithPointer<MouseEvent, NodeType>>();
  readonly onselectioncontextmenu = input<NodesEventWithPointer<MouseEvent, NodeType>>();

  protected store = injectStore<NodeType>();

  private wrapper = viewChild<ElementRef<HTMLDivElement>>('wrapper');

  private bounds = computed<Rect | null>(() => {
    const store = this.store;
    if (store.selectionRectMode === 'nodes') {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      store.nodes;
      const nodeBounds = getInternalNodesBounds(store.nodeLookup, {
        filter: (node) => !!node.selected
      });
      if (nodeBounds.width > 0 && nodeBounds.height > 0) {
        return nodeBounds;
      }
    }
    return null;
  });

  protected isActive = computed(() => {
    const bounds = this.bounds();
    return (
      this.store.selectionRectMode === 'nodes' && !!bounds && isNumeric(bounds.x) && isNumeric(bounds.y)
    );
  });

  protected wrapperClasses = computed(() => ['ng-flow__selection-wrapper', this.store.noPanClass]);
  protected widthPx = computed(() => toPxString(this.bounds()?.width));
  protected heightPx = computed(() => toPxString(this.bounds()?.height));
  protected transform = computed(() => `translate(${this.bounds()?.x ?? 0}px, ${this.bounds()?.y ?? 0}px)`);

  private dragHandler = createDragHandler<NodeType>({
    store: this.store,
    onDrag: (event, _, __, nodes) => {
      this.onnodedrag()?.({ event, targetNode: null, nodes: nodes as NodeType[] });
    },
    onDragStart: (event, _, __, nodes) => {
      this.onnodedragstart()?.({ event, targetNode: null, nodes: nodes as NodeType[] });
    },
    onDragStop: (event, _, __, nodes) => {
      this.onnodedragstop()?.({ event, targetNode: null, nodes: nodes as NodeType[] });
    }
  });

  constructor() {
    effect(() => {
      const wrapper = this.wrapper()?.nativeElement;
      if (wrapper) {
        this.dragHandler.update({ domNode: wrapper, disabled: false });
        if (!this.store.disableKeyboardA11y) {
          wrapper.focus({ preventScroll: true });
        }
      } else {
        this.dragHandler.destroy();
      }
    });
  }

  ngOnDestroy() {
    this.dragHandler.destroy();
  }

  protected oncontextmenu(event: MouseEvent) {
    const selectedNodes = this.store.nodes.filter((n) => n.selected);
    this.onselectioncontextmenu()?.({ nodes: selectedNodes, event });
  }

  protected onclick(event: MouseEvent) {
    const selectedNodes = this.store.nodes.filter((n) => n.selected);
    this.onselectionclick()?.({ nodes: selectedNodes, event });
  }

  protected onkeydown(event: KeyboardEvent) {
    if (this.store.disableKeyboardA11y) {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(arrowKeyDiffs, event.key)) {
      event.preventDefault();
      this.store.moveSelectedNodes(arrowKeyDiffs[event.key], event.shiftKey ? 4 : 1);
    }
  }
}
