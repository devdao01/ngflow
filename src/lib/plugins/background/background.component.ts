import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { injectStore } from '../../store';
import type { ClassValue } from '../../types';
import { cc } from '../../utils';

export enum BackgroundVariant {
  Lines = 'lines',
  Dots = 'dots',
  Cross = 'cross'
}

const defaultSize = {
  [BackgroundVariant.Dots]: 1,
  [BackgroundVariant.Lines]: 1,
  [BackgroundVariant.Cross]: 6
};

@Component({
  selector: 'ng-flow-background',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [class]="svgClasses()"
      data-testid="ng-flow__background"
      [style.--xy-background-color-props]="bgColor()"
      [style.--xy-background-pattern-color-props]="patternColor()"
    >
      <svg:pattern
        [attr.id]="patternId()"
        [attr.x]="store.viewport.x % scaledGap()[0]"
        [attr.y]="store.viewport.y % scaledGap()[1]"
        [attr.width]="scaledGap()[0]"
        [attr.height]="scaledGap()[1]"
        patternUnits="userSpaceOnUse"
        [attr.patternTransform]="patternTransform()"
      >
        @if (isDots()) {
          <svg:circle
            [attr.cx]="scaledSize() / 2"
            [attr.cy]="scaledSize() / 2"
            [attr.r]="scaledSize() / 2"
            [class]="dotClasses()"
          />
        } @else {
          <svg:path [attr.stroke-width]="lineWidth()" [attr.d]="linePath()" [class]="lineClasses()" />
        }
      </svg:pattern>
      <svg:rect x="0" y="0" width="100%" height="100%" [attr.fill]="patternFill()" />
    </svg>
  `,
  styles: `
    :host {
      display: contents;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `
})
export class BackgroundComponent {
  /** When multiple backgrounds are present on the page, each one should have a unique id. */
  readonly id = input<string | undefined>(undefined);
  /** Color of the background */
  readonly bgColor = input<string | undefined>(undefined);
  /** Color of the pattern */
  readonly patternColor = input<string | undefined>(undefined);
  /** Class applied to the pattern */
  readonly patternClass = input<string | undefined>(undefined);
  /** Class applied to the container */
  readonly class = input<ClassValue>();
  /** The gap between patterns. @default 20 */
  readonly gap = input<number | [number, number]>(20);
  /** The radius of each dot or the size of each rectangle. */
  readonly size = input<number | undefined>(undefined);
  /** The stroke thickness used when drawing the pattern. @default 1 */
  readonly lineWidth = input<number>(1);
  /** Variant of the pattern. @default BackgroundVariant.Dots */
  readonly variant = input<BackgroundVariant>(BackgroundVariant.Dots);

  protected store = injectStore();

  protected isDots = computed(() => this.variant() === BackgroundVariant.Dots);
  protected isCross = computed(() => this.variant() === BackgroundVariant.Cross);
  protected gapXY = computed<number[]>(() => {
    const gap = this.gap();
    return Array.isArray(gap) ? gap : [gap, gap];
  });

  protected patternId = computed(() => `background-pattern-${this.store.flowId}-${this.id() ?? ''}`);
  protected patternFill = computed(() => `url(#${this.patternId()})`);
  protected scaledGap = computed(() => [
    this.gapXY()[0] * this.store.viewport.zoom || 1,
    this.gapXY()[1] * this.store.viewport.zoom || 1
  ]);
  protected scaledSize = computed(
    () => (this.size() ?? defaultSize[this.variant()]) * this.store.viewport.zoom
  );

  protected patternDimensions = computed(
    () => (this.isCross() ? [this.scaledSize(), this.scaledSize()] : this.scaledGap()) as [number, number]
  );
  protected patternOffset = computed(() =>
    this.isDots()
      ? [this.scaledSize() / 2, this.scaledSize() / 2]
      : [this.patternDimensions()[0] / 2, this.patternDimensions()[1] / 2]
  );
  protected patternTransform = computed(
    () => `translate(-${this.patternOffset()[0]},-${this.patternOffset()[1]})`
  );
  protected linePath = computed(() => {
    const dimensions = this.patternDimensions();
    return `M${dimensions[0] / 2} 0 V${dimensions[1]} M0 ${dimensions[1] / 2} H${dimensions[0]}`;
  });

  protected svgClasses = computed(() => cc(['ng-flow__background', 'ng-flow__container', this.class()]));
  protected dotClasses = computed(() => cc(['ng-flow__background-pattern', 'dots', this.patternClass()]));
  protected lineClasses = computed(() => cc(['ng-flow__background-pattern', this.variant(), this.patternClass()]));
}
