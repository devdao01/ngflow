import { ChangeDetectionStrategy, Component, computed } from '@angular/core';

import { injectStore } from '../../store';

@Component({
  selector: 'ng-flow-viewport',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    class: 'ng-flow__viewport xyflow__viewport ng-flow__container',
    '[style.transform]': 'transform()'
  }
})
export class ViewportComponent {
  protected store = injectStore();

  protected transform = computed(() => {
    const { x, y, zoom } = this.store.viewport;
    return `translate(${x}px, ${y}px) scale(${zoom})`;
  });
}
