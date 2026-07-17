import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { getStraightPath } from '@xyflow/system';

import { BaseEdgeComponent } from './base-edge.component';
import type { StyleValue } from '../../types';

@Component({
  selector: 'g[ngFlowStraightEdge]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseEdgeComponent],
  template: `
    <svg:g
      ngFlowBaseEdge
      [id]="id()"
      [path]="pathData()[0]"
      [labelX]="pathData()[1]"
      [labelY]="pathData()[2]"
      [label]="label()"
      [labelStyle]="labelStyle()"
      [markerStart]="markerStart()"
      [markerEnd]="markerEnd()"
      [interactionWidth]="interactionWidth()"
      [style]="style()"
    />
  `
})
export class StraightEdgeComponent {
  readonly id = input<string | undefined>(undefined);
  readonly interactionWidth = input<number | undefined>(undefined);
  readonly label = input<string | undefined>(undefined);
  readonly labelStyle = input<StyleValue | undefined>(undefined);
  readonly markerEnd = input<string | undefined>(undefined);
  readonly markerStart = input<string | undefined>(undefined);
  readonly sourceX = input.required<number>();
  readonly sourceY = input.required<number>();
  readonly style = input<StyleValue | undefined>(undefined);
  readonly targetX = input.required<number>();
  readonly targetY = input.required<number>();

  protected pathData = computed(() =>
    getStraightPath({
      sourceX: this.sourceX(),
      sourceY: this.sourceY(),
      targetX: this.targetX(),
      targetY: this.targetY()
    })
  );
}

export { StraightEdgeComponent as StraightEdgeInternalComponent };
