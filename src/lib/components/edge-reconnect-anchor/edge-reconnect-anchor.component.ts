import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { XYHandle, type HandleType, type OnConnectStart, type XYPosition } from '@xyflow/system';

import { injectStore } from '../../store';
import { injectEdgeId } from '../../store/context';
import { EdgeLabelComponent } from '../edge-label/edge-label.component';
import type { ClassValue, Edge, Node } from '../../types';
import { cc } from '../../utils';

@Component({
  selector: 'ng-flow-edge-reconnect-anchor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EdgeLabelComponent],
  template: `
    <ng-flow-edge-label
      [x]="position()?.x ?? 0"
      [y]="position()?.y ?? 0"
      [width]="size()"
      [height]="size()"
      [class]="labelClasses()"
      [transparent]="true"
      (pointerdown)="onPointerDown($event)"
    >
      <div [style.display]="reconnecting() ? 'none' : 'contents'">
        <ng-content />
      </div>
    </ng-flow-edge-label>
  `
})
export class EdgeReconnectAnchorComponent<EdgeType extends Edge = Edge> {
  readonly type = input.required<HandleType>();
  readonly reconnecting = model<boolean>(false);
  readonly position = input<XYPosition | undefined>(undefined);
  readonly class = input<ClassValue>();
  readonly size = input<number>(25);
  readonly dragThreshold = input<number | undefined>(1);

  protected store = injectStore<Node, EdgeType>();
  private edgeId = injectEdgeId('EdgeReconnectAnchor must be used within a Custom Edge component');

  protected labelClasses = computed(() =>
    cc(['ng-flow__edgeupdater', `ng-flow__edgeupdater-${this.type()}`, this.store.noPanClass, this.class()])
  );

  protected onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    const store = this.store;
    const type = this.type();
    const {
      autoPanOnConnect,
      domNode,
      connectionMode,
      connectionRadius,
      onconnectstart,
      onreconnect,
      onreconnectstart,
      onreconnectend,
      onbeforereconnect,
      cancelConnection,
      nodeLookup,
      flowId,
      panBy,
      updateConnection,
      edgeLookup
    } = store;

    const edge = edgeLookup.get(this.edgeId)!;

    const _onConnectStart: OnConnectStart = (evt, params) => {
      this.reconnecting.set(true);
      onreconnectstart?.(event, edge, type);
      onconnectstart?.(evt, params);
    };

    const opposite =
      type === 'target'
        ? { nodeId: edge.source, handleId: edge.sourceHandle ?? null, type: 'source' as HandleType }
        : {
            nodeId: edge.target,
            handleId: edge.targetHandle ?? null,
            type: 'target' as HandleType
          };

    XYHandle.onPointerDown(event, {
      autoPanOnConnect,
      connectionMode,
      connectionRadius,
      domNode,
      handleId: opposite.handleId,
      nodeId: opposite.nodeId,
      nodeLookup,
      isTarget: opposite.type === 'target',
      edgeUpdaterType: opposite.type,
      lib: 'ng',
      flowId,
      cancelConnection,
      panBy,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      isValidConnection: (edge: any) => store.isValidConnection?.(edge) ?? true,
      onConnectStart: _onConnectStart,
      onConnectEnd: (...args) => store.onconnectend?.(...args),
      onConnect: (connection) => {
        const reconnectedEdge = { ...edge, ...connection };
        const newEdge = onbeforereconnect ? onbeforereconnect(reconnectedEdge, edge) : reconnectedEdge;

        if (!newEdge) {
          return;
        }

        store.edges = store.edges.map((e) => (e.id === edge.id ? (newEdge as EdgeType) : e));
        onreconnect?.(edge, connection);
      },
      onReconnectEnd: (event, connectionState) => {
        this.reconnecting.set(false);
        onreconnectend?.(event, edge, opposite.type, connectionState);
      },
      updateConnection,
      getTransform: () => [store.viewport.x, store.viewport.y, store.viewport.zoom],
      getFromHandle: () => store.connection.fromHandle,
      dragThreshold: this.dragThreshold() ?? store.connectionDragThreshold,
      handleDomNode: event.currentTarget as HTMLElement
    });
  };
}
