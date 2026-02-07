'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface GraphNode {
  id: string;
  label?: string;
  name: string;
  type: string;
  mention_count: number;
  first_seen?: string;
  last_seen?: string;
  documents: string[];
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  evidence: Array<{
    doc_id: string;
    page_id: string;
    snippet: string;
    timestamp?: string;
  }>;
}

interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
}

// Custom node component
const EntityNode = ({ data }: { data: GraphNode }) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'PERSON':
        return '#3b82f6'; // blue
      case 'ORG':
        return '#10b981'; // green
      case 'GPE':
        return '#f59e0b'; // amber
      case 'DATE':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  };

  const color = getNodeColor(data.type);

  return (
    <div
      style={{
        background: 'white',
        border: `3px solid ${color}`,
        borderRadius: '8px',
        padding: '10px 15px',
        minWidth: '120px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: color,
            marginBottom: '4px',
          }}
        >
          {data.type}
        </div>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
          {data.label || data.name}
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          {data.mention_count} mentions
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

export default function GraphVisualization({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
}: GraphVisualizationProps) {
  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState([]);

  // Convert our nodes to ReactFlow format
  useEffect(() => {
    if (nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    console.log('GraphVisualization: Processing nodes', nodes.length, 'edges', edges.length);

    const flowNodes: Node[] = nodes.map((node, index) => ({
      id: node.id,
      type: 'entity',
      position: {
        x: Math.random() * 800 + 100,
        y: Math.random() * 600 + 100,
      },
      data: {
        ...node,
        label: node.label || node.name, // Ensure label is set
      },
    }));

    // Simple force-directed layout (can be improved with d3-force)
    const layoutNodes = flowNodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / flowNodes.length;
      const radius = Math.min(300, 200 + flowNodes.length * 10);
      return {
        ...node,
        position: {
          x: 400 + radius * Math.cos(angle),
          y: 300 + radius * Math.sin(angle),
        },
      };
    });

    console.log('GraphVisualization: Setting nodes', layoutNodes.length);
    setNodes(layoutNodes);
  }, [nodes, setNodes, setEdges]);

  // Convert our edges to ReactFlow format
  useEffect(() => {
    if (edges.length === 0) {
      setEdges([]);
      return;
    }

    console.log('GraphVisualization: Processing edges', edges.length);

    const flowEdges: Edge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: `${edge.weight}`,
      style: {
        strokeWidth: Math.min(edge.weight * 2, 8),
        stroke: '#94a3b8',
      },
      data: edge,
    }));

    console.log('GraphVisualization: Setting edges', flowEdges.length);
    setEdges(flowEdges);
  }, [edges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClickHandler = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node.data as GraphNode);
      }
    },
    [onNodeClick]
  );

  const onEdgeClickHandler = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (onEdgeClick) {
        onEdgeClick(edge.data as GraphEdge);
      }
    },
    [onEdgeClick]
  );

  if (nodes.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#6b7280',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
          No entities found
        </div>
        <div style={{ fontSize: '14px', textAlign: 'center', maxWidth: '400px' }}>
          The PDF parser didn't find any entities (people, organizations, locations) in the document.
          This might be because the entity extraction is using basic pattern matching.
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%', minHeight: '600px' }}>
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClickHandler}
          onEdgeClick={onEdgeClickHandler}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Controls />
          <MiniMap />
          <Background />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
