import { getElementsToRemove } from '@xyflow/system';

import type { NgFlowStore } from '../store/types';
import type { Node, Edge } from '../types';

/**
 * Deletes nodes and edges (shared by the KeyHandler and the useNgFlow hook).
 */
export async function deleteElements<NodeType extends Node = Node, EdgeType extends Edge = Edge>(
  store: NgFlowStore<NodeType, EdgeType>,
  {
    nodes: nodesToRemove = [],
    edges: edgesToRemove = []
  }: {
    nodes?: (Partial<NodeType> & { id: string })[];
    edges?: (Partial<EdgeType> & { id: string })[];
  }
): Promise<{ deletedNodes: NodeType[]; deletedEdges: EdgeType[] }> {
  const { nodes: matchingNodes, edges: matchingEdges } = await getElementsToRemove<NodeType, EdgeType>({
    nodesToRemove,
    edgesToRemove,
    nodes: store.nodes,
    edges: store.edges,
    onBeforeDelete: store.onbeforedelete
  });

  if (matchingNodes) {
    store.nodes = store.nodes.filter((node) => !matchingNodes.some(({ id }) => id === node.id));
  }

  if (matchingEdges) {
    store.edges = store.edges.filter((edge) => !matchingEdges.some(({ id }) => id === edge.id));
  }

  if (matchingNodes.length > 0 || matchingEdges.length > 0) {
    store.ondelete?.({
      nodes: matchingNodes,
      edges: matchingEdges
    });
  }

  return {
    deletedNodes: matchingNodes,
    deletedEdges: matchingEdges
  };
}
