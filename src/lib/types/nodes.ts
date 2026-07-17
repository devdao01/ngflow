import type { Type } from '@angular/core';
import type { InternalNodeBase, NodeBase, NodeProps as NodePropsBase } from '@xyflow/system';

import type { ClassValue, DomAttributes, StyleValue } from './utils';

/**
 * The node data structure that gets used for internal nodes.
 * There are some data structures added under node.internal
 * that are needed for tracking some properties
 * @public
 */
export type InternalNode<NodeType extends Node = Node> = InternalNodeBase<NodeType>;

/**
 * The node data structure that gets used for the nodes prop.
 * @public
 */
export type Node<
  NodeData extends Record<string, unknown> = Record<string, unknown>,
  NodeType extends string | undefined = string | undefined
> = NodeBase<NodeData, NodeType> & {
  class?: ClassValue;
  style?: StyleValue;
  focusable?: boolean;
  /**
   * The ARIA role attribute for the node element, used for accessibility.
   * @default "group"
   */
  ariaRole?: string;

  /**
   * General escape hatch for adding custom attributes to the node's DOM element.
   */
  domAttributes?: DomAttributes;
};

/**
 * The props a custom node component receives (as Angular inputs).
 */
export type NodeProps<NodeType extends Node = Node> = Omit<NodePropsBase<NodeType>, 'type'> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: any;
};

/**
 * Node type key → Angular component. The component gets the `NodeProps`
 * passed as inputs through NgComponentOutlet.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NodeTypes = Record<string, Type<any>>;

export type BuiltInNode =
  | Node<{ label: string }, 'input' | 'output' | 'default' | undefined>
  | Node<Record<string, never>, 'group'>;
