import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { injectStore } from '../../store';
import { EdgeWrapperComponent } from '../../components/edge-wrapper/edge-wrapper.component';
import { MarkerDefinitionComponent } from './marker-definition.component';
import type { Edge, Node } from '../../types';

@Component({
  selector: 'ng-flow-edge-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EdgeWrapperComponent, MarkerDefinitionComponent],
  template: `
    <svg class="ng-flow__marker">
      <defs ngFlowMarkerDefinition></defs>
    </svg>

    @for (edge of visibleEdges(); track edge.id) {
      @if (!edge.hidden) {
        <svg
          ngFlowEdgeWrapper
          [edge]="edge"
          [onedgeclick]="onedgeclick()"
          [onedgecontextmenu]="onedgecontextmenu()"
          [onedgepointerenter]="onedgepointerenter()"
          [onedgepointerleave]="onedgepointerleave()"
        ></svg>
      }
    }
  `,
  host: {
    class: 'ng-flow__edges'
  }
})
export class EdgeRendererComponent<EdgeType extends Edge = Edge> {
  readonly onedgeclick = input<({ edge, event }: { edge: EdgeType; event: MouseEvent }) => void>();
  readonly onedgecontextmenu = input<({ edge, event }: { edge: EdgeType; event: MouseEvent }) => void>();
  readonly onedgepointerenter = input<({ edge, event }: { edge: EdgeType; event: PointerEvent }) => void>();
  readonly onedgepointerleave = input<({ edge, event }: { edge: EdgeType; event: PointerEvent }) => void>();

  protected store = injectStore<Node, EdgeType>();

  protected visibleEdges = computed(() => [...this.store.visible.edges.values()]);
}
