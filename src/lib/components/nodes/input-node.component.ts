import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Position } from '@xyflow/system';

import { HandleComponent } from '../handle/handle.component';

@Component({
  selector: 'ng-flow-input-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HandleComponent],
  template: `
    {{ label() }}
    <ng-flow-handle type="source" [position]="sourcePos()" />
  `
})
export class InputNodeComponent {
  readonly data = input<Record<string, unknown>>({ label: 'Node' });
  readonly sourcePosition = input<Position | undefined>(undefined);

  protected sourcePos = computed(() => this.sourcePosition() ?? Position.Bottom);

  protected label = () => this.data()?.['label'];
}
