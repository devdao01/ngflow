import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input
} from '@angular/core';

import { injectStore } from '../../store';
import { injectEdgeId } from '../../store/context';
import { tryToMount } from '../../directives/portal.directive';
import { cc, toPxString } from '../../utils';
import type { ClassValue } from '../../types';

@Component({
  selector: 'ng-flow-edge-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    '[class]': 'classes()',
    '[style.cursor]': `selectEdgeOnClick() ? 'pointer' : null`,
    '[style.transform]': 'transform()',
    '[style.pointer-events]': `'all'`,
    '[style.width]': 'widthPx()',
    '[style.height]': 'heightPx()',
    '[style.z-index]': 'zIndex()',
    '[style.background]': `transparent() ? 'transparent' : null`,
    tabindex: '-1',
    '(click)': 'onClick()'
  }
})
export class EdgeLabelComponent {
  readonly x = input<number>(0);
  readonly y = input<number>(0);
  readonly width = input<number | undefined>(undefined);
  readonly height = input<number | undefined>(undefined);
  readonly selectEdgeOnClick = input<boolean>(false);
  readonly transparent = input<boolean>(false);
  readonly class = input<ClassValue>();

  private store = injectStore();
  private edgeId = injectEdgeId('EdgeLabel must be used within a Custom Edge component');
  private element = inject(ElementRef).nativeElement as Element;

  protected zIndex = computed(() => this.store.visible.edges.get(this.edgeId)?.zIndex);
  protected transform = computed(() => `translate(-50%, -50%) translate(${this.x()}px,${this.y()}px)`);
  protected widthPx = computed(() => toPxString(this.width()));
  protected heightPx = computed(() => toPxString(this.height()));
  protected classes = computed(() =>
    cc(['ng-flow__edge-label', { transparent: this.transparent() }, this.class()])
  );

  constructor() {
    // The label always portals itself into the flow's edge-labels container.
    effect(() => {
      tryToMount(this.element, this.store.domNode, 'edge-labels');
    });
  }

  ngOnDestroy() {
    this.element.parentNode?.removeChild(this.element);
  }

  protected onClick() {
    if (this.selectEdgeOnClick() && this.edgeId) {
      this.store.handleEdgeSelection(this.edgeId);
    }
  }
}
