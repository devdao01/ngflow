import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input
} from '@angular/core';
import { Position, getNodeToolbarTransform, getNodesBounds, type Align } from '@xyflow/system';

import { injectStore } from '../../store';
import { injectNodeId } from '../../store/context';
import { tryToMount } from '../../directives/portal.directive';
import type { InternalNode } from '../../types';

/**
 * A toolbar (rendered above the flow, following its node) for one or
 * multiple nodes.
 */
@Component({
  selector: 'ng-flow-node-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    class: 'ng-flow__node-toolbar',
    '[attr.data-id]': 'dataId()',
    '[style.position]': `'absolute'`,
    '[style.transform]': 'transform()',
    '[style.z-index]': 'zIndex()',
    '[style.display]': `isActive() ? null : 'none'`
  }
})
export class NodeToolbarComponent {
  /** The id of the node, or array of ids the toolbar should be displayed at */
  readonly nodeId = input<string | string[] | undefined>(undefined);
  /** Position of the toolbar relative to the node */
  readonly position = input<Position>(Position.Top);
  /** Align the toolbar relative to the node */
  readonly align = input<Align>('center');
  /** Offset the toolbar from the node */
  readonly offset = input<number>(10);
  /** If true, node toolbar is visible even if node is not selected */
  readonly isVisible = input<boolean | undefined>(undefined);

  protected store = injectStore();
  private contextNodeId = injectNodeId();
  private element = inject(ElementRef).nativeElement as Element;

  private toolbarNodes = computed<InternalNode[]>(() => {
    const store = this.store;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    store.nodes;
    const nodeId = this.nodeId();
    const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId ?? this.contextNodeId];

    return nodeIds.reduce<InternalNode[]>((res, nodeId) => {
      if (!nodeId) {
        throw new Error('Either pass a nodeId or use within a Custom Node component');
      }
      const node = this.store.nodeLookup.get(nodeId);

      if (node) {
        res.push(node);
      }

      return res;
    }, []);
  });

  protected dataId = computed(() =>
    this.toolbarNodes()
      .reduce((acc, node) => `${acc}${node.id} `, '')
      .trim()
  );

  protected transform = computed<string>(() => {
    const nodeRect = getNodesBounds(this.toolbarNodes(), {
      nodeLookup: this.store.nodeLookup,
      nodeOrigin: this.store.nodeOrigin
    });
    if (nodeRect) {
      return getNodeToolbarTransform(nodeRect, this.store.viewport, this.position(), this.offset(), this.align());
    }
    return '';
  });

  protected zIndex = computed(() =>
    this.toolbarNodes().length === 0
      ? 1
      : Math.max(...this.toolbarNodes().map((node) => (node.internals.z || 5) + 1))
  );

  private selectedNodesCount = computed(() => this.store.nodes.filter((node) => node.selected).length);

  // if isVisible is not set, we show the toolbar only if its node is selected and no other node is selected
  protected isActive = computed(() => {
    const isVisible = this.isVisible();
    const toolbarNodes = this.toolbarNodes();
    return typeof isVisible === 'boolean'
      ? isVisible
      : toolbarNodes.length === 1 && toolbarNodes[0].selected && this.selectedNodesCount() === 1;
  });

  constructor() {
    effect(() => {
      tryToMount(this.element, this.store.domNode, 'root');
    });
  }

  ngOnDestroy() {
    this.element.parentNode?.removeChild(this.element);
  }
}
