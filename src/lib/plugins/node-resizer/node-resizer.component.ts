import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  ResizeControlVariant,
  XY_RESIZER_HANDLE_POSITIONS,
  XY_RESIZER_LINE_POSITIONS,
  type ResizeControlDirection,
  type ShouldResize,
  type OnResizeStart,
  type OnResize,
  type OnResizeEnd
} from '@xyflow/system';

import { ResizeControlComponent } from './resize-control.component';
import type { StyleValue } from '../../types';

@Component({
  selector: 'ng-flow-node-resizer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResizeControlComponent],
  template: `
    @if (isVisible()) {
      @for (position of linePositions; track position) {
        <ng-flow-resize-control
          [class]="lineClass()"
          [style]="lineStyle()"
          [nodeId]="nodeId()"
          [position]="position"
          [autoScale]="autoScale()"
          [variant]="lineVariant"
          [color]="color()"
          [minWidth]="minWidth()"
          [minHeight]="minHeight()"
          [maxWidth]="maxWidth()"
          [maxHeight]="maxHeight()"
          [keepAspectRatio]="keepAspectRatio()"
          [resizeDirection]="resizeDirection()"
          [shouldResize]="shouldResize()"
          [onResizeStart]="onResizeStart()"
          [onResize]="onResize()"
          [onResizeEnd]="onResizeEnd()"
        />
      }
      @for (position of handlePositions; track position) {
        <ng-flow-resize-control
          [class]="handleClass()"
          [style]="handleStyle()"
          [nodeId]="nodeId()"
          [position]="position"
          [autoScale]="autoScale()"
          [color]="color()"
          [minWidth]="minWidth()"
          [minHeight]="minHeight()"
          [maxWidth]="maxWidth()"
          [maxHeight]="maxHeight()"
          [keepAspectRatio]="keepAspectRatio()"
          [resizeDirection]="resizeDirection()"
          [shouldResize]="shouldResize()"
          [onResizeStart]="onResizeStart()"
          [onResize]="onResize()"
          [onResizeEnd]="onResizeEnd()"
        />
      }
    }
  `
})
export class NodeResizerComponent {
  readonly nodeId = input<string | undefined>(undefined);
  readonly color = input<string | undefined>(undefined);
  readonly handleClass = input<string | undefined>(undefined);
  readonly handleStyle = input<StyleValue | undefined>(undefined);
  readonly lineClass = input<string | undefined>(undefined);
  readonly lineStyle = input<StyleValue | undefined>(undefined);
  readonly isVisible = input<boolean>(true);
  readonly minWidth = input<number>(10);
  readonly minHeight = input<number>(10);
  readonly maxWidth = input<number>(Number.MAX_VALUE);
  readonly maxHeight = input<number>(Number.MAX_VALUE);
  readonly keepAspectRatio = input<boolean>(false);
  readonly autoScale = input<boolean>(true);
  readonly shouldResize = input<ShouldResize | undefined>(undefined);
  readonly onResizeStart = input<OnResizeStart | undefined>(undefined);
  readonly onResize = input<OnResize | undefined>(undefined);
  readonly onResizeEnd = input<OnResizeEnd | undefined>(undefined);
  readonly resizeDirection = input<ResizeControlDirection | undefined>(undefined);

  protected linePositions = XY_RESIZER_LINE_POSITIONS;
  protected handlePositions = XY_RESIZER_HANDLE_POSITIONS;
  protected lineVariant = ResizeControlVariant.Line;
}
