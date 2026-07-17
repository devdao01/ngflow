import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { getEdgeToolbarTransform } from '@xyflow/system';

export type AlignX = 'left' | 'center' | 'right';
export type AlignY = 'top' | 'center' | 'bottom';

import { injectStore } from '../../store';
import { injectEdgeId } from '../../store/context';
import { EdgeLabelComponent } from '../../components/edge-label/edge-label.component';
import type { ClassValue } from '../../types';
import { cc } from '../../utils';

@Component({
  selector: 'ng-flow-edge-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EdgeLabelComponent],
  template: `
    <ng-flow-edge-label
      [selectEdgeOnClick]="selectEdgeOnClick()"
      [transparent]="true"
      [style.display]="isActive() ? null : 'none'"
    >
      <div
        style="position: absolute; transform-origin: 0 0"
        [style.transform]="transform()"
        [class]="toolbarClasses()"
        [attr.data-id]="edgeId"
      >
        <ng-content />
      </div>
    </ng-flow-edge-label>
  `
})
export class EdgeToolbarComponent {
  readonly x = input<number>(0);
  readonly y = input<number>(0);
  readonly alignX = input<AlignX>('center');
  readonly alignY = input<AlignY>('center');
  readonly isVisible = input<boolean | undefined>(undefined);
  readonly selectEdgeOnClick = input<boolean>(false);
  readonly class = input<ClassValue>();

  protected store = injectStore();
  protected edgeId = injectEdgeId('EdgeToolbar must be used within an edge');

  protected isActive = computed(() => {
    const isVisible = this.isVisible();
    return typeof isVisible === 'boolean' ? isVisible : !!this.store.edgeLookup.get(this.edgeId)?.selected;
  });

  protected transform = computed(() =>
    getEdgeToolbarTransform(this.x(), this.y(), this.store.viewport.zoom, this.alignX(), this.alignY())
  );

  protected toolbarClasses = computed(() => cc(['ng-flow__edge-toolbar', this.class()]));
}
