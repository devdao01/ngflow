import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ClassValue } from '../../types';
import { cc } from '../../utils';

@Component({
  selector: 'button[ngFlowControlButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    type: 'button',
    '[class]': 'classes()',
    '[style.--xy-controls-button-background-color-props]': 'bgColor()',
    '[style.--xy-controls-button-background-color-hover-props]': 'bgColorHover()',
    '[style.--xy-controls-button-color-props]': 'color()',
    '[style.--xy-controls-button-color-hover-props]': 'colorHover()',
    '[style.--xy-controls-button-border-color-props]': 'borderColor()'
  }
})
export class ControlButtonComponent {
  readonly class = input<ClassValue>();
  readonly bgColor = input<string | undefined>(undefined);
  readonly bgColorHover = input<string | undefined>(undefined);
  readonly color = input<string | undefined>(undefined);
  readonly colorHover = input<string | undefined>(undefined);
  readonly borderColor = input<string | undefined>(undefined);

  protected classes = computed(() => cc(['ng-flow__controls-button', this.class()]));
}
