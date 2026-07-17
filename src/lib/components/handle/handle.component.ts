import { ChangeDetectionStrategy, Component, computed, effect, input } from '@angular/core';
import {
  Position,
  XYHandle,
  isMouseEvent,
  areConnectionMapsEqual,
  handleConnectionChange,
  ConnectionMode,
  getHostForElement,
  type HandleType,
  type HandleConnection,
  type Optional,
  type ConnectionState,
  type FinalConnectionState,
  type Connection,
  type IsValidConnection
} from '@xyflow/system';

import { injectStore } from '../../store';
import { cc } from '../../utils';
import { injectNodeId, injectNodeConnectable } from '../../store/context';
import type { ClassValue, StyleValue } from '../../types';

/**
 * The Handle component is the part of a node that can be used to connect nodes.
 */
@Component({
  selector: 'ng-flow-handle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    '[attr.data-handleid]': 'id()',
    '[attr.data-nodeid]': 'nodeId',
    '[attr.data-handlepos]': 'positionResolved()',
    '[attr.data-id]': 'dataId()',
    '[class]': 'classes()',
    '[style]': 'style()',
    role: 'button',
    '[attr.aria-label]': 'ariaLabel()',
    tabindex: '-1',
    '(mousedown)': 'onpointerdown($event)',
    '(touchstart)': 'onpointerdown($event)',
    '(click)': 'onclick($event)'
  }
})
export class HandleComponent {
  readonly id = input<string | null>(null);
  readonly type = input<HandleType>('source');
  readonly position = input<Position | undefined>(Position.Top);
  readonly style = input<StyleValue>();
  readonly class = input<ClassValue>();
  readonly isConnectable = input<boolean | undefined>(undefined);
  readonly isConnectableStart = input<boolean>(true);
  readonly isConnectableEnd = input<boolean>(true);
  readonly isValidConnection = input<IsValidConnection>();
  readonly onconnect = input<(connections: HandleConnection[]) => void>();
  readonly ondisconnect = input<(connections: HandleConnection[]) => void>();

  protected store = injectStore();
  protected nodeId = injectNodeId('Handle must be used within a Custom Node component');
  private connectableContext = injectNodeConnectable();

  private isTarget = computed(() => this.type() === 'target');
  protected positionResolved = computed(() => this.position() ?? Position.Top);
  private isConnectableResolved = computed(() =>
    this.isConnectable() !== undefined ? !!this.isConnectable() : (this.connectableContext?.() ?? false)
  );

  protected dataId = computed(
    () => `${this.store.flowId}-${this.nodeId}-${this.id() ?? 'null'}-${this.type()}`
  );
  protected ariaLabel = computed(() => this.store.ariaLabelConfig['handle.ariaLabel']);

  private connectionSlices = computed<[boolean, boolean | null, boolean | null, boolean, boolean | null]>(
    () => {
      if (!this.store.connection.inProgress) {
        return [false, false, false, false, null];
      }

      const { fromHandle, toHandle, isValid } = this.store.connection;
      const nodeId = this.nodeId;
      const handleId = this.id();
      const type = this.type();

      const connectingFrom =
        fromHandle && fromHandle.nodeId === nodeId && fromHandle.type === type && fromHandle.id === handleId;

      const connectingTo =
        toHandle && toHandle.nodeId === nodeId && toHandle.type === type && toHandle.id === handleId;

      const isPossibleTargetHandle =
        this.store.connectionMode === ConnectionMode.Strict
          ? fromHandle?.type !== type
          : nodeId !== fromHandle?.nodeId || handleId !== fromHandle?.id;

      const valid = connectingTo && isValid;

      return [true, !!connectingFrom, !!connectingTo, isPossibleTargetHandle, valid ?? null];
    }
  );

  protected classes = computed(() => {
    const [connectionInProgress, connectingFrom, connectingTo, isPossibleTargetHandle, valid] =
      this.connectionSlices();
    const isConnectable = this.isConnectableResolved();

    return cc([
      'ng-flow__handle',
      `ng-flow__handle-${this.positionResolved()}`,
      this.store.noDragClass,
      this.store.noPanClass,
      this.positionResolved(),
      {
        valid: !!valid,
        connectingto: !!connectingTo,
        connectingfrom: !!connectingFrom,
        source: !this.isTarget(),
        target: this.isTarget(),
        connectablestart: this.isConnectableStart(),
        connectableend: this.isConnectableEnd(),
        connectable: isConnectable,
        connectionindicator:
          isConnectable &&
          (!connectionInProgress || isPossibleTargetHandle) &&
          (connectionInProgress || this.store.clickConnectStartHandle
            ? this.isConnectableEnd()
            : this.isConnectableStart())
      },
      this.class()
    ]);
  });

  private prevConnections: Map<string, HandleConnection> | null = null;

  constructor() {
    effect(() => {
      const onconnect = this.onconnect();
      const ondisconnect = this.ondisconnect();
      if (onconnect || ondisconnect) {
        // connectionLookup is not reactive, so we use edges to get notified about updates
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this.store.edges;
        const connections = this.store.connectionLookup.get(
          `${this.nodeId}-${this.type()}${this.id() ? `-${this.id()}` : ''}`
        );

        if (this.prevConnections && !areConnectionMapsEqual(connections, this.prevConnections)) {
          const _connections = connections ?? new Map();

          handleConnectionChange(this.prevConnections, _connections, ondisconnect);
          handleConnectionChange(_connections, this.prevConnections, onconnect);
        }

        this.prevConnections = new Map(connections);
      }
    });
  }

  private onConnectExtended = (connection: Connection) => {
    const edge = this.store.onbeforeconnect ? this.store.onbeforeconnect(connection) : connection;

    if (!edge) {
      return;
    }

    this.store.addEdge(edge);
    this.store.onconnect?.(connection);
  };

  protected onpointerdown(event: MouseEvent | TouchEvent) {
    const store = this.store;
    const isMouseTriggered = isMouseEvent(event);

    if (event.currentTarget && ((isMouseTriggered && (event as MouseEvent).button === 0) || !isMouseTriggered)) {
      XYHandle.onPointerDown(event, {
        handleId: this.id(),
        nodeId: this.nodeId,
        isTarget: this.isTarget(),
        connectionRadius: store.connectionRadius,
        domNode: store.domNode,
        nodeLookup: store.nodeLookup,
        connectionMode: store.connectionMode,
        lib: 'ng',
        autoPanOnConnect: store.autoPanOnConnect,
        autoPanSpeed: store.autoPanSpeed,
        flowId: store.flowId,
        isValidConnection:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.isValidConnection() || ((edge: any) => store.isValidConnection?.(edge) ?? true),
        updateConnection: store.updateConnection,
        cancelConnection: store.cancelConnection,
        panBy: store.panBy,
        onConnect: this.onConnectExtended,
        onConnectStart: store.onconnectstart,
        onConnectEnd: (...args) => store.onconnectend?.(...args),
        getTransform: () => [store.viewport.x, store.viewport.y, store.viewport.zoom],
        getFromHandle: () => store.connection.fromHandle,
        dragThreshold: store.connectionDragThreshold,
        handleDomNode: event.currentTarget as HTMLElement
      });
    }
  }

  protected onclick(event: MouseEvent) {
    const store = this.store;
    if (!store.clickConnect) {
      return;
    }
    const nodeId = this.nodeId;
    const handleId = this.id();
    const type = this.type();

    if (!nodeId || (!store.clickConnectStartHandle && !this.isConnectableStart())) {
      return;
    }

    if (!store.clickConnectStartHandle) {
      store.onclickconnectstart?.(event, { nodeId, handleId, handleType: type });
      store.clickConnectStartHandle = { nodeId, type, id: handleId };
      return;
    }

    const doc = getHostForElement(event.target);
    const isValidConnectionHandler = this.isValidConnection() ?? store.isValidConnection;

    const { connectionMode, clickConnectStartHandle, flowId, nodeLookup } = store;
    const { connection, isValid } = XYHandle.isValid(event, {
      handle: {
        nodeId,
        id: handleId,
        type
      },
      connectionMode,
      fromNodeId: clickConnectStartHandle.nodeId,
      fromHandleId: clickConnectStartHandle.id ?? null,
      fromType: clickConnectStartHandle.type,
      isValidConnection: isValidConnectionHandler,
      flowId,
      doc,
      lib: 'ng',
      nodeLookup
    });

    if (isValid && connection) {
      this.onConnectExtended(connection);
    }

    const connectionClone = structuredClone(store.connection) as Optional<ConnectionState, 'inProgress'>;
    delete connectionClone.inProgress;
    connectionClone.toPosition = connectionClone.toHandle ? connectionClone.toHandle.position : null;
    store.onclickconnectend?.(event, connectionClone as FinalConnectionState);

    store.clickConnectStartHandle = null;
  }
}
