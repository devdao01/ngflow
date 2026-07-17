import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Position } from '@xyflow/system';

import { HandleComponent } from '../handle/handle.component';

@Component({
  selector: 'ng-flow-default-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HandleComponent],
  template: `
    <ng-flow-handle type="target" [position]="targetPos()" />
    {{ label() }}
    <ng-flow-handle type="source" [position]="sourcePos()" />
  `
})
export class DefaultNodeComponent {
  readonly data = input<Record<string, unknown>>({});
  readonly targetPosition = input<Position | undefined>(undefined);
  readonly sourcePosition = input<Position | undefined>(undefined);

  protected targetPos = computed(() => this.targetPosition() ?? Position.Top);
  protected sourcePos = computed(() => this.sourcePosition() ?? Position.Bottom);

  protected label = () => this.data()?.['label'];
}
