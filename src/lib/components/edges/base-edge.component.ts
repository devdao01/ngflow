import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EdgeLabelComponent } from '../edge-label/edge-label.component';
import { cc } from '../../utils';
import type { ClassValue, StyleValue } from '../../types';

/**
 * The base edge renders the path + interaction path + optional label.
 * Use it inside custom edges as `<svg:g ngFlowBaseEdge [path]="..." />`.
 */
@Component({
  selector: 'g[ngFlowBaseEdge]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EdgeLabelComponent],
  template: `
    <svg:path
      [attr.id]="id()"
      [attr.d]="path()"
      [class]="pathClasses()"
      [attr.marker-start]="markerStart()"
      [attr.marker-end]="markerEnd()"
      fill="none"
      [style]="style()"
    />
    @if ((interactionWidth() ?? 20) > 0) {
      <svg:path
        [attr.d]="path()"
        [attr.stroke-opacity]="0"
        [attr.stroke-width]="interactionWidth() ?? 20"
        fill="none"
        class="ng-flow__edge-interaction"
      />
    }
    @if (label()) {
      <ng-flow-edge-label [x]="labelX() ?? 0" [y]="labelY() ?? 0" [style]="labelStyle()" [selectEdgeOnClick]="true">
        {{ label() }}
      </ng-flow-edge-label>
    }
  `
})
export class BaseEdgeComponent {
  readonly id = input<string | undefined>(undefined);
  readonly path = input.required<string>();
  readonly label = input<string | undefined>(undefined);
  readonly labelX = input<number | undefined>(undefined);
  readonly labelY = input<number | undefined>(undefined);
  readonly labelStyle = input<StyleValue | undefined>(undefined);
  readonly markerStart = input<string | undefined>(undefined);
  readonly markerEnd = input<string | undefined>(undefined);
  readonly style = input<StyleValue | undefined>(undefined);
  readonly interactionWidth = input<number | undefined>(20);
  readonly class = input<ClassValue>();

  protected pathClasses = computed(() => cc(['ng-flow__edge-path', this.class()]));
}
