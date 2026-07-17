import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input } from '@angular/core';

import { injectStore } from '../../store';
import { tryToMount } from '../../directives/portal.directive';

/**
 * Renders its content inside the viewport (above or below the nodes/edges),
 * so it moves and scales with the flow.
 */
@Component({
  selector: 'ng-flow-viewport-portal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`
})
export class ViewportPortalComponent {
  readonly target = input<'front' | 'back'>('front');

  private store = injectStore();
  private element = inject(ElementRef).nativeElement as Element;

  constructor() {
    effect(() => {
      tryToMount(this.element, this.store.domNode, `viewport-${this.target()}`);
    });
  }

  ngOnDestroy() {
    this.element.parentNode?.removeChild(this.element);
  }
}
