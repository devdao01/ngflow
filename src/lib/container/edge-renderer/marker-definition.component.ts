import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarkerType } from '@xyflow/system';

import { injectStore } from '../../store';

@Component({
  selector: 'defs[ngFlowMarkerDefinition]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (marker of store.markers; track marker.id) {
      <svg:marker
        class="ng-flow__arrowhead"
        [attr.id]="marker.id"
        [attr.markerWidth]="'' + (marker.width ?? 12.5)"
        [attr.markerHeight]="'' + (marker.height ?? 12.5)"
        viewBox="-10 -10 20 20"
        [attr.markerUnits]="marker.markerUnits ?? 'strokeWidth'"
        [attr.orient]="marker.orient ?? 'auto-start-reverse'"
        refX="0"
        refY="0"
      >
        @if (marker.type === MarkerType.Arrow) {
          <svg:polyline
            class="arrow"
            [style.stroke]="marker.color ?? 'none'"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            [attr.stroke-width]="marker.strokeWidth"
            points="-5,-4 0,0 -5,4"
          />
        } @else if (marker.type === MarkerType.ArrowClosed) {
          <svg:polyline
            class="arrowclosed"
            [style.stroke]="marker.color ?? 'none'"
            [style.fill]="marker.color ?? 'none'"
            stroke-linecap="round"
            stroke-linejoin="round"
            [attr.stroke-width]="marker.strokeWidth"
            points="-5,-4 0,0 -5,4 -5,-4"
          />
        }
      </svg:marker>
    }
  `
})
export class MarkerDefinitionComponent {
  protected store = injectStore();
  protected MarkerType = MarkerType;
}
