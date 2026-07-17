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
  untracked
} from '@angular/core';
import {
  elementSelectionKeys,
  errorMessages,
  isInputDOMNode,
  nodeHasDimensions,
  getNodesInside,
  type Position
} from '@xyflow/system';

import { createDragHandler } from '../../directives/drag';
import { injectStore } from '../../store';
import { NODE_ID, NODE_CONNECTABLE } from '../../store/context';
import { arrowKeyDiffs, cc, toPxString } from '../../utils';
import { DynamicOutlet } from '../../utils/dynamic-outlet';
import { ARIA_NODE_DESC_KEY } from '../a11y';
import { DefaultNodeComponent } from '../nodes/default-node.component';

import type {
  Node,
  InternalNode,
  NodeEventWithPointer,
  NodeTargetEventWithPointer
} from '../../types';

@Component({
  selector: 'div[ngFlowNodeWrapper]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
  host: {
    '[attr.data-id]': 'id',
    '[class]': 'classes()',
    '[style]': 'nodeStyle()',
    '[style.z-index]': 'zIndex()',
    '[style.transform]': 'transform()',
    '[style.visibility]': `hasDimensions() ? 'visible' : 'hidden'`,
    '[attr.tabindex]': 'focusable() ? 0 : null',
    '[attr.role]': `role()`,
    '[attr.aria-label]': 'node().ariaLabel',
    '[attr.aria-roledescription]': `'node'`,
    '[attr.aria-describedby]': 'ariaDescribedBy()',
    '(click)': 'onSelectNodeHandler($event)',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(contextmenu)': 'onContextMenu($event)',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()'
  }
})
export class NodeWrapperComponent<NodeType extends Node = Node> implements OnDestroy {
  readonly node = input.required<InternalNode<NodeType>>();
  readonly resizeObserver = input<ResizeObserver | null>(null);
  readonly nodeClickDistance = input<number | undefined>(undefined);
  readonly onnodeclick = input<NodeEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodedrag = input<NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodedragstart = input<NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodedragstop = input<NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>>();
  readonly onnodepointerenter = input<NodeEventWithPointer<PointerEvent, NodeType>>();
  readonly onnodepointerleave = input<NodeEventWithPointer<PointerEvent, NodeType>>();
  readonly onnodepointermove = input<NodeEventWithPointer<PointerEvent, NodeType>>();
  readonly onnodecontextmenu = input<NodeEventWithPointer<MouseEvent, NodeType>>();

  protected store = injectStore<NodeType>();
  private element = inject(ElementRef).nativeElement as HTMLDivElement;
  private injector = inject(Injector);
  private appRef = inject(ApplicationRef);
  private environmentInjector = inject(EnvironmentInjector);

  // The id is stable for the lifetime of the wrapper (tracked by id in the renderer)
  get id() {
    return this.node().id;
  }

  protected draggable = computed(() => this.node().draggable ?? this.store.nodesDraggable);
  protected selectable = computed(() => this.node().selectable ?? this.store.elementsSelectable);
  protected connectable = computed(() => this.node().connectable ?? this.store.nodesConnectable);
  protected focusable = computed(() => this.node().focusable ?? this.store.nodesFocusable);
  protected deletable = computed(() => this.node().deletable ?? true);
  protected hasDimensions = computed(() => nodeHasDimensions(this.node()));
  private hasHandleBounds = computed(() => !!this.node().internals.handleBounds);
  private isInitialized = computed(() => this.hasDimensions() && this.hasHandleBounds());
  private isParent = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.node();
    return this.store.parentLookup.has(this.id);
  });

  protected type = computed(() => this.node().type ?? 'default');
  protected zIndex = computed(() => this.node().internals.z ?? 0);
  protected transform = computed(() => {
    const { x, y } = this.node().internals.positionAbsolute;
    return `translate(${x}px, ${y}px)`;
  });

  protected role = computed(() =>
    this.node().ariaRole ?? (this.focusable() ? 'group' : undefined)
  );
  protected ariaDescribedBy = computed(() =>
    this.store.disableKeyboardA11y ? undefined : `${ARIA_NODE_DESC_KEY}-${this.store.flowId}`
  );

  protected classes = computed(() => {
    const node = this.node();
    return cc([
      'ng-flow__node',
      `ng-flow__node-${this.type()}`,
      node.class,
      {
        dragging: node.dragging ?? false,
        selected: node.selected ?? false,
        draggable: this.draggable(),
        connectable: this.connectable(),
        selectable: this.selectable(),
        nopan: this.draggable(),
        parent: this.isParent()
      }
    ]);
  });

  protected nodeStyle = computed(() => {
    const node = this.node();
    const style = node.style ?? '';
    const measuredWidth = node.measured?.width;
    const measuredHeight = node.measured?.height;

    const w = measuredWidth === undefined ? (node.width ?? node.initialWidth) : node.width;
    const h = measuredHeight === undefined ? (node.height ?? node.initialHeight) : node.height;

    if (w === undefined && h === undefined && !style) {
      return undefined;
    }

    // Angular's style-string parser rejects empty declarations (`;;`),
    // so the parts are joined instead of blindly concatenated
    const parts: string[] = [];
    const userStyle = style.trim().replace(/;+\s*$/, '');
    if (userStyle) {
      parts.push(userStyle);
    }
    if (w) {
      parts.push(`width:${toPxString(w)}`);
    }
    if (h) {
      parts.push(`height:${toPxString(h)}`);
    }

    return parts.length > 0 ? parts.join('; ') : undefined;
  });

  // The custom node component gets a plain div host inside the node wrapper.
  // No inline display override: the component's own :host styles must win.
  private outlet = new DynamicOutlet(
    this.appRef,
    this.environmentInjector,
    () => document.createElement('div'),
    () => this.element
  );

  private nodeInjector: Injector | null = null;
  private dragHandler = createDragHandler<NodeType>({
    store: this.store,
    onNodeMouseDown: (id) => this.store.handleNodeSelection(id),
    onDrag: (event, _, targetNode, nodes) => {
      this.onnodedrag()?.({ event, targetNode: targetNode as NodeType, nodes: nodes as NodeType[] });
    },
    onDragStart: (event, _, targetNode, nodes) => {
      this.onnodedragstart()?.({ event, targetNode: targetNode as NodeType, nodes: nodes as NodeType[] });
    },
    onDragStop: (event, _, targetNode, nodes) => {
      this.onnodedragstop()?.({ event, targetNode: targetNode as NodeType, nodes: nodes as NodeType[] });
    }
  });

  private prevNodeRef: HTMLDivElement | null = null;
  private prevType: string | undefined = undefined;
  private prevSourcePosition: Position | undefined = undefined;
  private prevTargetPosition: Position | undefined = undefined;
  private prevDomAttributes: string[] = [];

  constructor() {
    // render / update the custom node component
    effect(() => {
      const node = this.node();
      const type = this.type();
      const NodeComponent = this.store.nodeTypes[type] ?? DefaultNodeComponent;

      if (!this.nodeInjector) {
        this.nodeInjector = Injector.create({
          providers: [
            { provide: NODE_ID, useValue: node.id },
            { provide: NODE_CONNECTABLE, useValue: this.connectable }
          ],
          parent: this.injector
        });
      }

      this.outlet.render(
        NodeComponent,
        {
          data: node.data ?? {},
          id: node.id,
          selected: node.selected ?? false,
          selectable: this.selectable(),
          deletable: this.deletable(),
          sourcePosition: node.sourcePosition,
          targetPosition: node.targetPosition,
          zIndex: this.zIndex(),
          dragging: node.dragging ?? false,
          draggable: this.draggable(),
          dragHandle: node.dragHandle,
          parentId: node.parentId,
          type,
          isConnectable: this.connectable(),
          positionAbsoluteX: node.internals.positionAbsolute.x,
          positionAbsoluteY: node.internals.positionAbsolute.y,
          width: node.width,
          height: node.height
        },
        this.nodeInjector
      );
    });

    // warn about unknown node types
    effect(() => {
      const valid = !!this.store.nodeTypes[this.type()];
      if (!valid) {
        this.store.onerror('003', errorMessages['error003'](this.type()));
      }
    });

    // keep the drag behavior in sync
    effect(() => {
      const node = this.node();
      this.dragHandler.update({
        domNode: this.element,
        nodeId: node.id,
        isSelectable: this.selectable(),
        disabled: !this.draggable(),
        handleSelector: node.dragHandle,
        noDragClass: this.store.noDragClass,
        nodeClickDistance: this.nodeClickDistance()
      });
    });

    // if type, sourcePosition or targetPosition changes,
    // we need to re-calculate the handle positions
    effect(() => {
      const type = this.type();
      const sourcePosition = this.node().sourcePosition;
      const targetPosition = this.node().targetPosition;

      const doUpdate =
        (this.prevType !== undefined && type !== this.prevType) ||
        sourcePosition !== this.prevSourcePosition ||
        targetPosition !== this.prevTargetPosition;

      if (doUpdate && this.prevType !== undefined) {
        requestAnimationFrame(() => {
          untracked(() =>
            this.store.updateNodeInternals(
              new Map([[this.id, { id: this.id, nodeElement: this.element, force: true }]])
            )
          );
        });
      }

      this.prevType = type;
      this.prevSourcePosition = sourcePosition;
      this.prevTargetPosition = targetPosition;
    });

    // observe dimensions
    effect(() => {
      const resizeObserver = this.resizeObserver();
      if (resizeObserver && (!this.isInitialized() || this.element !== this.prevNodeRef)) {
        if (this.prevNodeRef) {
          resizeObserver.unobserve(this.prevNodeRef);
        }
        resizeObserver.observe(this.element);
        this.prevNodeRef = this.element;
      }
    });

    // apply user-supplied dom attributes
    effect(() => {
      const domAttributes = this.node().domAttributes ?? {};
      for (const name of this.prevDomAttributes) {
        if (!(name in domAttributes)) {
          this.element.removeAttribute(name);
        }
      }
      for (const [name, value] of Object.entries(domAttributes)) {
        this.element.setAttribute(name, `${value}`);
      }
      this.prevDomAttributes = Object.keys(domAttributes);
    });
  }

  ngOnDestroy() {
    if (this.prevNodeRef) {
      this.resizeObserver()?.unobserve(this.prevNodeRef);
    }
    this.dragHandler.destroy();
    this.outlet.destroy();
  }

  protected onSelectNodeHandler(event: MouseEvent | TouchEvent) {
    const store = this.store;
    if (this.selectable() && (!store.selectNodesOnDrag || !this.draggable() || store.nodeDragThreshold > 0)) {
      // this handler gets called by XYDrag on drag start when selectNodesOnDrag=true
      // here we only need to call it when selectNodesOnDrag=false
      store.handleNodeSelection(this.id);
    }

    this.onnodeclick()?.({ node: this.node().internals.userNode, event });
  }

  protected onPointerEnter(event: PointerEvent) {
    this.onnodepointerenter()?.({ node: this.node().internals.userNode, event });
  }
  protected onPointerLeave(event: PointerEvent) {
    this.onnodepointerleave()?.({ node: this.node().internals.userNode, event });
  }
  protected onPointerMove(event: PointerEvent) {
    this.onnodepointermove()?.({ node: this.node().internals.userNode, event });
  }
  protected onContextMenu(event: MouseEvent) {
    this.onnodecontextmenu()?.({ node: this.node().internals.userNode, event });
  }

  protected onKeyDown(event: KeyboardEvent) {
    const store = this.store;
    if (!this.focusable() || isInputDOMNode(event) || store.disableKeyboardA11y) {
      return;
    }

    if (elementSelectionKeys.includes(event.key) && this.selectable()) {
      const unselect = event.key === 'Escape';

      store.handleNodeSelection(this.id, unselect, this.element);
    } else if (
      this.draggable() &&
      this.node().selected &&
      Object.prototype.hasOwnProperty.call(arrowKeyDiffs, event.key)
    ) {
      // prevent default scrolling behavior on arrow key press when node is moved
      event.preventDefault();
      store.ariaLiveMessage = store.ariaLabelConfig['node.a11yDescription.ariaLiveMessage']({
        direction: event.key.replace('Arrow', '').toLowerCase(),
        x: ~~this.node().internals.positionAbsolute.x,
        y: ~~this.node().internals.positionAbsolute.y
      });
      store.moveSelectedNodes(arrowKeyDiffs[event.key], event.shiftKey ? 4 : 1);
    }
  }

  protected onFocus() {
    const store = this.store;
    if (
      !this.focusable() ||
      store.disableKeyboardA11y ||
      !store.autoPanOnNodeFocus ||
      !this.element.matches(':focus-visible')
    ) {
      return;
    }

    const { width, height, viewport } = store;
    const node = this.node();

    const withinViewport =
      getNodesInside(
        new Map([[this.id, node]]),
        { x: 0, y: 0, width, height },
        [viewport.x, viewport.y, viewport.zoom],
        true
      ).length > 0;

    if (!withinViewport) {
      store.setCenter(
        node.position.x + (node.measured.width ?? 0) / 2,
        node.position.y + (node.measured.height ?? 0) / 2,
        { zoom: viewport.zoom }
      );
    }
  }
}
