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

// Custom node component - Detective Board Style
const EntityNode = ({ data }: { data: GraphNode }) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'PERSON':
        return '#8b4513'; // detective brown/red
      case 'ORG':
        return '#654321'; // dark brown
      case 'GPE':
        return '#6b4423'; // medium brown
      case 'DATE':
        return '#5d4037'; // darker brown
      default:
        return '#8b6f47'; // cork brown
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'PERSON':
        return '👤';
      case 'ORG':
        return '🏢';
      case 'GPE':
        return '📍';
      case 'DATE':
        return '📅';
      default:
        return '📋';
    }
  };

  const color = getNodeColor(data.type);
  const icon = getNodeIcon(data.type);

  return (
    <div
      style={{
        background: '#fef9e7',
        border: `2px solid ${color}`,
        borderRadius: '4px',
        padding: '12px 16px',
        minWidth: '140px',
        boxShadow: 
          '0 4px 8px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(139, 111, 71, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        position: 'relative',
        fontFamily: "'Courier New', monospace",
      }}
    >
      {/* Pin effect */}
      <div
        style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '18px',
          filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3))',
          zIndex: 10,
        }}
      >
        📌
      </div>
      
      <Handle type="target" position={Position.Top} style={{ background: color, width: '8px', height: '8px' }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '20px', marginBottom: '6px' }}>{icon}</div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            color: color,
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {data.type}
        </div>
        <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '6px', color: '#2c1810' }}>
          {data.label || data.name}
        </div>
        <div style={{ fontSize: '10px', color: '#6b4423', borderTop: `1px solid ${color}`, paddingTop: '6px', marginTop: '6px' }}>
          {data.mention_count} {data.mention_count === 1 ? 'mention' : 'mentions'}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: '8px', height: '8px' }} />
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
        strokeWidth: Math.min(edge.weight * 2 + 2, 10),
        stroke: '#8b6f47',
        strokeDasharray: edge.weight > 1 ? '0' : '5,5',
        opacity: 0.7,
      },
      labelStyle: {
        fill: '#654321',
        fontWeight: 'bold',
        fontSize: '12px',
        background: '#fef9e7',
        padding: '2px 6px',
        borderRadius: '3px',
      },
      labelBgStyle: {
        fill: '#fef9e7',
        fillOpacity: 0.9,
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
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          minHeight: '600px',
          background: '#d4a574',
          position: 'relative',
        }}
        className="detective-board-bg"
      >
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
          style={{ background: 'transparent' }}
        >
          <Controls 
            style={{
              background: 'rgba(254, 249, 231, 0.9)',
              border: '2px solid #8b6f47',
              borderRadius: '4px',
            }}
          />
          <MiniMap 
            style={{
              background: 'rgba(254, 249, 231, 0.9)',
              border: '2px solid #8b6f47',
            }}
            nodeColor="#8b6f47"
          />
          <Background 
            gap={20}
            size={1}
          />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
