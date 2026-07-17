import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { PanelPosition, ProOptions } from '@xyflow/system';

import { PanelComponent } from '../../container/panel/panel.component';

const link = 'https://github.com/xyflow/xyflow';

@Component({
  selector: 'ng-flow-attribution',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelComponent],
  template: `
    @if (!proOptions()?.hideAttribution) {
      <ng-flow-panel [position]="position() ?? 'bottom-right'" class="ng-flow__attribution">
        <a [href]="link" target="_blank" rel="noopener noreferrer" aria-label="Ng Flow attribution">
          Ng Flow
        </a>
      </ng-flow-panel>
    }
  `
})
export class AttributionComponent {
  readonly proOptions = input<ProOptions | undefined>(undefined);
  readonly position = input<PanelPosition | undefined>('bottom-right');

  protected link = link;
}
