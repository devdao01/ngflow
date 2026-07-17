import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EnvironmentInjector,
  Injector,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  viewChild,
  type Type
} from '@angular/core';
import {
  ConnectionLineType,
  getBezierPath,
  getConnectionStatus,
  getSmoothStepPath,
  getStraightPath
} from '@xyflow/system';

import { injectStore } from '../../store';
import { DynamicOutlet } from '../../utils/dynamic-outlet';
import type { StyleValue } from '../../types';

const SVG_NS = 'http://www.w3.org/2000/svg';

@Component({
  selector: 'ng-flow-connection-line',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.connection.inProgress) {
      <svg
        [attr.width]="store.width"
        [attr.height]="store.height"
        class="ng-flow__connectionline"
        [style]="containerStyle()"
      >
        <svg:g #connectionGroup [class]="groupClasses()">
          @if (!lineComponent()) {
            <svg:path [attr.d]="path()" [style]="style()" fill="none" class="ng-flow__connection-path" />
          }
        </svg:g>
      </svg>
    }
  `
})
export class ConnectionLineComponent implements OnDestroy {
  readonly type = input<ConnectionLineType>(ConnectionLineType.Bezier);
  readonly containerStyle = input<StyleValue | undefined>(undefined);
  readonly style = input<StyleValue | undefined>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly lineComponent = input<Type<any> | undefined>(undefined);

  protected store = injectStore();
  private injector = inject(Injector);
  private appRef = inject(ApplicationRef);
  private environmentInjector = inject(EnvironmentInjector);

  private connectionGroup = viewChild<ElementRef<SVGGElement>>('connectionGroup');

  protected groupClasses = computed(() => [
    'ng-flow__connection',
    getConnectionStatus(this.store.connection.isValid)
  ]);

  protected path = computed(() => {
    const store = this.store;
    if (!store.connection.inProgress) {
      return '';
    }

    const pathParams = {
      sourceX: store.connection.from.x,
      sourceY: store.connection.from.y,
      sourcePosition: store.connection.fromPosition,
      targetX: store.connection.to.x,
      targetY: store.connection.to.y,
      targetPosition: store.connection.toPosition
    };

    switch (this.type()) {
      case ConnectionLineType.Bezier: {
        const [path] = getBezierPath(pathParams);
        return path;
      }
      case ConnectionLineType.Straight: {
        const [path] = getStraightPath(pathParams);
        return path;
      }
      case ConnectionLineType.Step:
      case ConnectionLineType.SmoothStep: {
        const [path] = getSmoothStepPath({
          ...pathParams,
          borderRadius: this.type() === ConnectionLineType.Step ? 0 : undefined
        });
        return path;
      }
      default:
        return '';
    }
  });

  private outlet = new DynamicOutlet<SVGGElement>(
    this.appRef,
    this.environmentInjector,
    () => document.createElementNS(SVG_NS, 'g'),
    () => this.connectionGroup()!.nativeElement
  );

  constructor() {
    effect(() => {
      const lineComponent = this.lineComponent();
      const group = this.connectionGroup()?.nativeElement;

      if (lineComponent && group) {
        this.outlet.render(lineComponent, {}, this.injector);
      } else {
        this.outlet.destroy();
      }
    });
  }

  ngOnDestroy() {
    this.outlet.destroy();
  }
}
