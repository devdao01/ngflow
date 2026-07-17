import { ChangeDetectionStrategy, Component, OnDestroy, computed, input } from '@angular/core';

import { injectStore } from '../../store';
import { NodeWrapperComponent } from '../../components/node-wrapper/node-wrapper.component';
import type {
  Node,
  NodeEventWithPointer,
  NodeTargetEventWithPointer
} from '../../types';

@Component({
  selector: 'ng-flow-node-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NodeWrapperComponent],
  template: `
    @for (node of visibleNodes(); track node.id) {
      @if (!node.hidden) {
        <div
          ngFlowNodeWrapper
          [node]="node"
          [resizeObserver]="resizeObserver"
          [nodeClickDistance]="nodeClickDistance()"
          [onnodeclick]="onnodeclick()"
          [onnodepointerenter]="onnodepointerenter()"
          [onnodepointermove]="onnodepointermove()"
          [onnodepointerleave]="onnodepointerleave()"
          [onnodedrag]="onnodedrag()"
          [onnodedragstart]="onnodedragstart()"
          [onnodedragstop]="onnodedragstop()"
          [onnodecontextmenu]="onnodecontextmenu()"
        ></div>
      }
    }
  `,
  host: {
    class: 'ng-flow__nodes'
  }
})
export class NodeRendererComponent<NodeType extends Node = Node> implements OnDestroy {
  readonly nodeClickDistance = input<number | undefined>(undefined);
  readonly onnodeclick = input<NodeEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodecontextmenu = input<NodeEventWithPointer<MouseEvent, NodeType>>();
  readonly onnodepointerenter = input<NodeEventWithPointer<PointerEvent, NodeType>>();
  readonly onnodepointermove = input<NodeEventWithPointer<PointerEvent, NodeType>>();
  readonly onnodepointerleave = input<NodeEventWithPointer<PointerEvent, NodeType>>();
  readonly onnodedrag = input<NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodedragstart = input<NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodedragstop = input<NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>>();

  protected store = injectStore<NodeType>();

  protected visibleNodes = computed(() => [...this.store.visible.nodes.values()]);

  protected resizeObserver: ResizeObserver | null =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries: ResizeObserverEntry[]) => {
          const updates = new Map();

          entries.forEach((entry: ResizeObserverEntry) => {
            const id = entry.target.getAttribute('data-id') as string;

            updates.set(id, {
              id,
              nodeElement: entry.target as HTMLDivElement,
              force: true
            });
          });

          this.store.updateNodeInternals(updates);
        });

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }
}
