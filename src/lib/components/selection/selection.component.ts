import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { toPxString } from '../../utils';

@Component({
  selector: 'ng-flow-selection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isVisible()) {
      <div
        class="ng-flow__selection"
        [style.width]="widthPx()"
        [style.height]="heightPx()"
        [style.transform]="transform()"
      ></div>
    }
  `,
  styles: `
    .ng-flow__selection {
      position: absolute;
      top: 0;
      left: 0;
    }
  `
})
export class SelectionComponent {
  readonly x = input<number>(0);
  readonly y = input<number>(0);
  readonly width = input<number | string>(0);
  readonly height = input<number | string>(0);
  readonly isVisible = input<boolean>(true);

  protected widthPx = computed(() => {
    const width = this.width();
    return typeof width === 'string' ? width : toPxString(width);
  });
  protected heightPx = computed(() => {
    const height = this.height();
    return typeof height === 'string' ? height : toPxString(height);
  });
  protected transform = computed(() => `translate(${this.x()}px, ${this.y()}px)`);
}
