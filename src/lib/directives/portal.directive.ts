import { Directive, ElementRef, effect, inject, input } from '@angular/core';

import { injectStore } from '../store/context';
import type { NgFlowStore } from '../store/types';

export type PortalTarget = 'viewport-back' | 'viewport-front' | 'root' | 'edge-labels';

export function tryToMount(node: Element, domNode: Element | null, target: PortalTarget | undefined) {
  if (!target || !domNode) {
    return false;
  }

  const targetEl = target === 'root' ? domNode : domNode.querySelector(`.ng-flow__${target}`);

  if (targetEl) {
    targetEl.appendChild(node);
    return true;
  }
  return false;
}

/**
 * Moves the host element into one of the flow's layer containers
 * (Angular version of the Svelte `use:portal` action).
 */
@Directive({ selector: '[ngFlowPortal]' })
export class FlowPortalDirective {
  readonly ngFlowPortal = input.required<PortalTarget>();

  private element = inject(ElementRef).nativeElement as Element;
  private store: NgFlowStore = injectStore();

  constructor() {
    effect(() => {
      tryToMount(this.element, this.store.domNode, this.ngFlowPortal());
    });
  }

  ngOnDestroy() {
    this.element.parentNode?.removeChild(this.element);
  }
}
