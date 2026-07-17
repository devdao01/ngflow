import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  viewChild
} from '@angular/core';
import {
  XYMinimap,
  getBoundsOfRects,
  getInternalNodesBounds,
  getNodeDimensions,
  nodeHasDimensions,
  type PanelPosition
} from '@xyflow/system';

import { injectStore } from '../../store';
import { PanelComponent } from '../../container/panel/panel.component';
import type { ClassValue, Node, StyleValue } from '../../types';
import { cc } from '../../utils';

export type GetMiniMapNodeAttribute = (node: Node) => string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAttrFunction = (func: any): GetMiniMapNodeAttribute =>
  func instanceof Function ? func : () => func;

type MiniMapNodeViewModel = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  color?: string;
  strokeColor: string;
  class: string;
};

@Component({
  selector: 'ng-flow-minimap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelComponent],
  template: `
    <ng-flow-panel
      [position]="position()"
      [class]="panelClasses()"
      data-testid="ng-flow__minimap"
      [style.--xy-minimap-background-color-props]="bgColor()"
      [style]="style()"
    >
      @if (store.panZoom) {
        <svg
          #minimapSvg
          [attr.width]="width()"
          [attr.height]="height()"
          [attr.viewBox]="viewBox()"
          class="ng-flow__minimap-svg"
          role="img"
          [attr.aria-labelledby]="labelledBy()"
          [style.--xy-minimap-mask-background-color-props]="maskColor()"
          [style.--xy-minimap-mask-stroke-color-props]="maskStrokeColor()"
          [style.--xy-minimap-mask-stroke-width-props]="scaledMaskStrokeWidth()"
        >
          @if (resolvedAriaLabel()) {
            <svg:title [attr.id]="labelledBy()">{{ resolvedAriaLabel() }}</svg:title>
          }

          @for (node of minimapNodes(); track node.id) {
            <svg:rect
              [class]="['ng-flow__minimap-node', node.class]"
              [class.selected]="node.selected"
              [attr.x]="node.x"
              [attr.y]="node.y"
              [attr.rx]="nodeBorderRadius()"
              [attr.ry]="nodeBorderRadius()"
              [attr.width]="node.width"
              [attr.height]="node.height"
              [style.fill]="node.color"
              [style.stroke]="node.strokeColor"
              [style.stroke-width]="nodeStrokeWidth()"
              [attr.shape-rendering]="shapeRendering"
            />
          }
          <svg:path
            class="ng-flow__minimap-mask"
            [attr.d]="maskPath()"
            fill-rule="evenodd"
            pointer-events="none"
          />
        </svg>
      }
    </ng-flow-panel>
  `
})
export class MinimapComponent implements OnDestroy {
  readonly position = input<PanelPosition>('bottom-right');
  readonly ariaLabel = input<string | null | undefined>(undefined);
  readonly nodeStrokeColor = input<string | GetMiniMapNodeAttribute>('transparent');
  readonly nodeColor = input<string | GetMiniMapNodeAttribute | undefined>(undefined);
  readonly nodeClass = input<string | GetMiniMapNodeAttribute>('');
  readonly nodeBorderRadius = input<number>(5);
  readonly nodeStrokeWidth = input<number>(2);
  readonly bgColor = input<string | undefined>(undefined);
  readonly maskColor = input<string | undefined>(undefined);
  readonly maskStrokeColor = input<string | undefined>(undefined);
  readonly maskStrokeWidth = input<number | undefined>(undefined);
  readonly width = input<number>(200);
  readonly height = input<number>(150);
  readonly pannable = input<boolean>(true);
  readonly zoomable = input<boolean>(true);
  readonly inversePan = input<boolean | undefined>(undefined);
  readonly zoomStep = input<number | undefined>(undefined);
  readonly class = input<ClassValue>();
  readonly style = input<StyleValue | undefined>(undefined);

  protected store = injectStore();

  private minimapSvg = viewChild<ElementRef<SVGSVGElement>>('minimapSvg');

  protected shapeRendering =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof window === 'undefined' || !!(window as any).chrome ? 'crispEdges' : 'geometricPrecision';

  protected labelledBy = computed(() => `ng-flow__minimap-desc-${this.store.flowId}`);
  protected resolvedAriaLabel = computed(
    () => this.ariaLabel() ?? this.store.ariaLabelConfig['minimap.ariaLabel']
  );
  protected panelClasses = computed(() => cc(['ng-flow__minimap', this.class()]));

  private viewBB = computed(() => ({
    x: -this.store.viewport.x / this.store.viewport.zoom,
    y: -this.store.viewport.y / this.store.viewport.zoom,
    width: this.store.width / this.store.viewport.zoom,
    height: this.store.height / this.store.viewport.zoom
  }));

  private boundingRect = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.store.nodes;
    return getBoundsOfRects(
      getInternalNodesBounds(this.store.nodeLookup, { filter: (n) => !n.hidden }),
      this.viewBB()
    );
  });

  private viewScaleValue = computed(() => {
    const scaledWidth = this.boundingRect().width / this.width();
    const scaledHeight = this.boundingRect().height / this.height();
    return Math.max(scaledWidth, scaledHeight);
  });

  private viewWidth = computed(() => this.viewScaleValue() * this.width());
  private viewHeight = computed(() => this.viewScaleValue() * this.height());
  private offset = computed(() => 5 * this.viewScaleValue());
  private x = computed(
    () => this.boundingRect().x - (this.viewWidth() - this.boundingRect().width) / 2 - this.offset()
  );
  private y = computed(
    () => this.boundingRect().y - (this.viewHeight() - this.boundingRect().height) / 2 - this.offset()
  );
  private viewboxWidth = computed(() => this.viewWidth() + this.offset() * 2);
  private viewboxHeight = computed(() => this.viewHeight() + this.offset() * 2);

  protected viewBox = computed(() => `${this.x()} ${this.y()} ${this.viewboxWidth()} ${this.viewboxHeight()}`);
  protected scaledMaskStrokeWidth = computed(() => {
    const strokeWidth = this.maskStrokeWidth();
    return strokeWidth ? strokeWidth * this.viewScaleValue() : undefined;
  });

  protected maskPath = computed(() => {
    const x = this.x();
    const y = this.y();
    const offset = this.offset();
    const viewboxWidth = this.viewboxWidth();
    const viewboxHeight = this.viewboxHeight();
    const viewBB = this.viewBB();
    return `M${x - offset},${y - offset}h${viewboxWidth + offset * 2}v${viewboxHeight + offset * 2}h${
      -viewboxWidth - offset * 2
    }z M${viewBB.x},${viewBB.y}h${viewBB.width}v${viewBB.height}h${-viewBB.width}z`;
  });

  protected minimapNodes = computed<MiniMapNodeViewModel[]>(() => {
    const result: MiniMapNodeViewModel[] = [];
    const nodeColor = this.nodeColor();
    const nodeStrokeColor = this.nodeStrokeColor();
    const nodeClass = this.nodeClass();

    for (const userNode of this.store.nodes) {
      const node = this.store.nodeLookup.get(userNode.id);
      if (node && nodeHasDimensions(node) && !node.hidden) {
        const { width, height } = getNodeDimensions(node);
        result.push({
          id: node.id,
          x: node.internals.positionAbsolute.x,
          y: node.internals.positionAbsolute.y,
          width,
          height,
          selected: !!node.selected,
          color: nodeColor === undefined ? undefined : getAttrFunction(nodeColor)(userNode),
          strokeColor: getAttrFunction(nodeStrokeColor)(userNode),
          class: getAttrFunction(nodeClass)(userNode)
        });
      }
    }
    return result;
  });

  private minimapInstance: ReturnType<typeof XYMinimap> | null = null;

  constructor() {
    effect(() => {
      const svg = this.minimapSvg()?.nativeElement;
      const panZoom = this.store.panZoom;

      if (!svg || !panZoom) {
        this.minimapInstance?.destroy();
        this.minimapInstance = null;
        return;
      }

      if (!this.minimapInstance) {
        this.minimapInstance = XYMinimap({
          domNode: svg,
          panZoom,
          getTransform: () => {
            const { viewport } = this.store;
            return [viewport.x, viewport.y, viewport.zoom];
          },
          getViewScale: () => this.viewScaleValue()
        });
      }

      this.minimapInstance.update({
        translateExtent: this.store.translateExtent,
        width: this.store.width,
        height: this.store.height,
        inversePan: this.inversePan(),
        zoomStep: this.zoomStep(),
        pannable: this.pannable(),
        zoomable: this.zoomable()
      });
    });
  }

  ngOnDestroy() {
    this.minimapInstance?.destroy();
  }
}
