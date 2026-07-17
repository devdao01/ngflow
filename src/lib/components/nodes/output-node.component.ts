import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Position } from '@xyflow/system';

import { HandleComponent } from '../handle/handle.component';

@Component({
  selector: 'ng-flow-output-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HandleComponent],
  template: `
    {{ label() }}
    <ng-flow-handle type="target" [position]="targetPos()" />
  `
})
export class OutputNodeComponent {
  readonly data = input<Record<string, unknown>>({ label: 'Node' });
  readonly targetPosition = input<Position | undefined>(undefined);

  protected targetPos = computed(() => this.targetPosition() ?? Position.Top);

  protected label = () => this.data()?.['label'];
}
