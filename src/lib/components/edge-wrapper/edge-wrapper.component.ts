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
  viewChild
} from '@angular/core';
import { elementSelectionKeys, getMarkerId } from '@xyflow/system';

import { injectStore } from '../../store';
import { EDGE_ID } from '../../store/context';
import { DynamicOutlet } from '../../utils/dynamic-outlet';
import { cc } from '../../utils';
import { ARIA_EDGE_DESC_KEY } from '../a11y';
import { BezierEdgeInternalComponent } from '../edges';

import type { Edge, EdgeLayouted, Node } from '../../types';

const SVG_NS = 'http://www.w3.org/2000/svg';

@Component({
  selector: 'svg[ngFlowEdgeWrapper]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg:g
      #edgeRef
      [class]="gClasses()"
      [attr.data-id]="id"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-describedby]="focusable() ? edgeDescId : null"
      [attr.role]="role()"
      [attr.aria-roledescription]="'edge'"
      [attr.tabindex]="focusable() ? 0 : null"
      (click)="onclick($event)"
      (contextmenu)="oncontextmenu($event)"
      (pointerenter)="onpointerenter($event)"
      (pointerleave)="onpointerleave($event)"
      (keydown)="onkeydown($event)"
    ></svg:g>
  `,
  host: {
    class: 'ng-flow__edge-wrapper',
    '[style.z-index]': 'edge().zIndex'
  }
})
export class EdgeWrapperComponent<EdgeType extends Edge = Edge> implements OnDestroy {
  readonly edge = input.required<EdgeLayouted<EdgeType>>();
  readonly onedgeclick = input<({ edge, event }: { edge: EdgeType; event: MouseEvent }) => void>();
  readonly onedgecontextmenu = input<({ edge, event }: { edge: EdgeType; event: MouseEvent }) => void>();
  readonly onedgepointerenter = input<({ edge, event }: { edge: EdgeType; event: PointerEvent }) => void>();
  readonly onedgepointerleave = input<({ edge, event }: { edge: EdgeType; event: PointerEvent }) => void>();

  protected store = injectStore<Node, EdgeType>();
  private injector = inject(Injector);
  private appRef = inject(ApplicationRef);
  private environmentInjector = inject(EnvironmentInjector);

  private edgeRef = viewChild.required<ElementRef<SVGGElement>>('edgeRef');

  get id() {
    return this.edge().id;
  }

  protected selectable = computed(() => this.edge().selectable ?? this.store.elementsSelectable);
  protected focusable = computed(() => this.edge().focusable ?? this.store.edgesFocusable);

  protected gClasses = computed(() => {
    const edge = this.edge();
    return cc([
      'ng-flow__edge',
      edge.class,
      {
        animated: edge.animated ?? false,
        selected: edge.selected ?? false,
        selectable: this.selectable()
      }
    ]);
  });

  protected ariaLabel = computed(() => {
    const edge = this.edge();
    return edge.ariaLabel === null
      ? undefined
      : (edge.ariaLabel ?? `Edge from ${edge.source} to ${edge.target}`);
  });
  protected role = computed(() => this.edge().ariaRole ?? (this.focusable() ? 'group' : 'img'));

  protected get edgeDescId() {
    return `${ARIA_EDGE_DESC_KEY}-${this.store.flowId}`;
  }

  private outlet = new DynamicOutlet<SVGGElement>(
    this.appRef,
    this.environmentInjector,
    () => document.createElementNS(SVG_NS, 'g'),
    () => this.edgeRef().nativeElement
  );

  private edgeInjector: Injector | null = null;
  private prevDomAttributes: string[] = [];

  constructor() {
    effect(() => {
      const edge = this.edge();
      const type = edge.type ?? 'default';
      const EdgeComponent = this.store.edgeTypes[type] ?? BezierEdgeInternalComponent;

      if (!this.edgeInjector) {
        this.edgeInjector = Injector.create({
          providers: [{ provide: EDGE_ID, useValue: edge.id }],
          parent: this.injector
        });
      }

      this.outlet.render(
        EdgeComponent,
        {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceX: edge.sourceX,
          sourceY: edge.sourceY,
          targetX: edge.targetX,
          targetY: edge.targetY,
          sourcePosition: edge.sourcePosition,
          targetPosition: edge.targetPosition,
          animated: edge.animated ?? false,
          selected: edge.selected ?? false,
          label: edge.label,
          labelStyle: edge.labelStyle,
          data: edge.data ?? {},
          style: edge.style,
          interactionWidth: edge.interactionWidth,
          selectable: this.selectable(),
          deletable: edge.deletable ?? true,
          type,
          sourceHandleId: edge.sourceHandle,
          targetHandleId: edge.targetHandle,
          markerStart: edge.markerStart
            ? `url('#${getMarkerId(edge.markerStart, this.store.flowId)}')`
            : undefined,
          markerEnd: edge.markerEnd
            ? `url('#${getMarkerId(edge.markerEnd, this.store.flowId)}')`
            : undefined
        },
        this.edgeInjector
      );
    });

    // apply user-supplied dom attributes to the edge group element
    effect(() => {
      const g = this.edgeRef().nativeElement;
      const domAttributes = this.edge().domAttributes ?? {};
      for (const name of this.prevDomAttributes) {
        if (!(name in domAttributes)) {
          g.removeAttribute(name);
        }
      }
      for (const [name, value] of Object.entries(domAttributes)) {
        g.setAttribute(name, `${value}`);
      }
      this.prevDomAttributes = Object.keys(domAttributes);
    });
  }

  ngOnDestroy() {
    this.outlet.destroy();
  }

  protected onclick(event: MouseEvent) {
    const edge = this.store.edgeLookup.get(this.id);

    if (edge) {
      if (this.selectable()) {
        this.store.handleEdgeSelection(this.id);
      }
      this.onedgeclick()?.({ event, edge });
    }
  }

  private onmouseevent<T>(event: T, callback?: ({ edge, event }: { edge: EdgeType; event: T }) => void) {
    const edge = this.store.edgeLookup.get(this.id);

    if (edge && callback) {
      callback({ event, edge });
    }
  }

  protected oncontextmenu(event: MouseEvent) {
    this.onmouseevent(event, this.onedgecontextmenu());
  }
  protected onpointerenter(event: PointerEvent) {
    this.onmouseevent(event, this.onedgepointerenter());
  }
  protected onpointerleave(event: PointerEvent) {
    this.onmouseevent(event, this.onedgepointerleave());
  }

  protected onkeydown(event: KeyboardEvent) {
    const store = this.store;
    if (this.focusable() && !store.disableKeyboardA11y && elementSelectionKeys.includes(event.key) && this.selectable()) {
      const unselect = event.key === 'Escape';

      if (unselect) {
        this.edgeRef().nativeElement.blur();
        store.unselectNodesAndEdges({ edges: [this.edge().edge] });
      } else {
        store.addSelectedEdges([this.id]);
      }
    }
  }
}
