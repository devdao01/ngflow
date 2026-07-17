import { ChangeDetectionStrategy, Component, forwardRef, signal } from '@angular/core';

import { createStore } from '../../store';
import { FLOW_STORE_CONTEXT } from '../../store/context';
import type { NgFlowStore, ProviderContext, StoreSignals } from '../../store/types';
import type { Edge, Node } from '../../types';

/**
 * Placeholder props for the provider's initial store: every prop signal
 * resolves to undefined until a NgFlow instance replaces the store.
 */
const emptyProps = new Proxy(
  {},
  {
    get: () => () => undefined
  }
) as StoreSignals['props'];

/**
 * Wrap your app (or a part of it) with NgFlowProvider to access the flow's
 * store from components that are not children of the NgFlow component itself.
 */
@Component({
  selector: 'ng-flow-provider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  providers: [
    {
      provide: FLOW_STORE_CONTEXT,
      useExisting: forwardRef(() => NgFlowProviderComponent)
    }
  ]
})
export class NgFlowProviderComponent<NodeType extends Node = Node, EdgeType extends Edge = Edge>
  implements ProviderContext<NodeType, EdgeType>
{
  private storeSignal = signal<NgFlowStore<NodeType, EdgeType>>(
    createStore<NodeType, EdgeType>({
      props: emptyProps as StoreSignals<NodeType, EdgeType>['props'],
      nodes: signal<NodeType[]>([]),
      edges: signal<EdgeType[]>([]),
      viewport: signal(undefined)
    })
  );

  readonly provider = true;

  getStore() {
    return this.storeSignal();
  }

  setStore(store: NgFlowStore<NodeType, EdgeType>) {
    this.storeSignal.set(store);
  }

  ngOnDestroy() {
    this.getStore().reset();
  }
}
