import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { getBezierPath, Position, type BezierPathOptions } from '@xyflow/system';

import { BaseEdgeComponent } from './base-edge.component';
import type { StyleValue } from '../../types';

/**
 * Bezier edge – used internally for edge type 'default' and exported for
 * custom edges. Mirrors BezierEdge.svelte (which also backs BezierEdgeInternal).
 */
@Component({
  selector: 'g[ngFlowBezierEdge]',
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
export class BezierEdgeComponent {
  readonly id = input<string | undefined>(undefined);
  readonly interactionWidth = input<number | undefined>(undefined);
  readonly label = input<string | undefined>(undefined);
  readonly labelStyle = input<StyleValue | undefined>(undefined);
  readonly markerEnd = input<string | undefined>(undefined);
  readonly markerStart = input<string | undefined>(undefined);
  readonly pathOptions = input<BezierPathOptions | undefined>(undefined);
  readonly sourcePosition = input<Position>(Position.Bottom);
  readonly sourceX = input.required<number>();
  readonly sourceY = input.required<number>();
  readonly style = input<StyleValue | undefined>(undefined);
  readonly targetPosition = input<Position>(Position.Top);
  readonly targetX = input.required<number>();
  readonly targetY = input.required<number>();

  protected pathData = computed(() =>
    getBezierPath({
      sourceX: this.sourceX(),
      sourceY: this.sourceY(),
      targetX: this.targetX(),
      targetY: this.targetY(),
      sourcePosition: this.sourcePosition(),
      targetPosition: this.targetPosition(),
      curvature: this.pathOptions()?.curvature
    })
  );
}

export { BezierEdgeComponent as BezierEdgeInternalComponent };
