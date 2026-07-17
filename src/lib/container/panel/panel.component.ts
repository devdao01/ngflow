import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { PanelPosition } from '@xyflow/system';

import type { ClassValue, StyleValue } from '../../types';
import { cc } from '../../utils';

/**
 * The Panel component helps you position content above the viewport.
 * It is used internally by the Minimap and Controls components.
 */
@Component({
  selector: 'ng-flow-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    '[class]': 'classes()',
    '[style]': 'style()'
  }
})
export class PanelComponent {
  readonly position = input<PanelPosition>('top-right');
  readonly style = input<StyleValue | undefined>(undefined);
  readonly class = input<ClassValue>();

  protected classes = computed(() =>
    cc(['ng-flow__panel', this.class(), ...`${this.position()}`.split('-')])
  );
}
