'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
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
  image?: string;
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
  timelineRange?: { start: string | null; end: string | null };
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
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
        {!(data.id === 'person_epstein_jeffrey' || data.id === 'person_maxwell_ghislaine') &&
        (data.first_seen || data.last_seen) ? (
          <div style={{ fontSize: '10px', color: '#6b4423', borderTop: `1px solid ${color}`, paddingTop: '6px', marginTop: '6px' }}>
            {data.first_seen && data.last_seen
              ? `${formatDate(data.first_seen)} – ${formatDate(data.last_seen)}`
              : data.first_seen
              ? `From ${formatDate(data.first_seen)}`
              : `Until ${formatDate(data.last_seen!)}`}
          </div>
        ) : (
          <div style={{ fontSize: '10px', color: '#6b4423', borderTop: `1px solid ${color}`, paddingTop: '6px', marginTop: '6px' }}>
            {data.mention_count} {data.mention_count === 1 ? 'mention' : 'mentions'}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: '8px', height: '8px' }} />
    </div>
  );
};

// Image node component - displays image with connections
const ImageNode = ({ data }: { data: GraphNode }) => {
  const imageUrl = data.image ? `/api/image?path=${encodeURIComponent(data.image)}` : null;

  return (
    <div
      style={{
        background: '#fef9e7',
        border: '2px solid #8b6f47',
        borderRadius: '4px',
        padding: '8px',
        minWidth: '120px',
        maxWidth: '180px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(139, 111, 71, 0.1)',
        position: 'relative',
        fontFamily: "'Courier New', monospace",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#8b6f47', width: '8px', height: '8px' }} />
      <div style={{ textAlign: 'center' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={data.name}
            style={{
              width: '100%',
              height: '100px',
              objectFit: 'cover',
              borderRadius: '4px',
              display: 'block',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100px', background: '#e8dcc8', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            🖼️
          </div>
        )}
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#654321', marginTop: '6px', textTransform: 'uppercase' }}>
          {data.label || data.name}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#8b6f47', width: '8px', height: '8px' }} />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  entity: EntityNode,
  image: ImageNode,
};

export default function GraphVisualization({
  nodes,
  edges,
  timelineRange,
  onNodeClick,
  onEdgeClick,
}: GraphVisualizationProps) {
  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const positionCache = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Convert our nodes to ReactFlow format - d3-force layout (spaced out, no overlap)
  useEffect(() => {
    if (nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const WIDTH = 1400;
    const HEIGHT = 1100;
    const CENTER_X = WIDTH / 2;
    const CENTER_Y = HEIGHT / 2;
    const NODE_RADIUS = 95;
    const cache = positionCache.current;

    const simNodes = nodes.map((node) => {
      const cached = cache.get(node.id);
      return {
        id: node.id,
        x: cached?.x ?? CENTER_X + (Math.random() - 0.5) * 400,
        y: cached?.y ?? CENTER_Y + (Math.random() - 0.5) * 400,
      };
    });

    const simLinks = edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    const simulation = forceSimulation(simNodes)
      .force(
        'link',
        forceLink(simLinks)
          .id((d) => (d as { id: string }).id)
          .distance(280)
      )
      .force('charge', forceManyBody().strength(-600))
      .force('center', forceCenter(CENTER_X, CENTER_Y))
      .force('collision', forceCollide(NODE_RADIUS));

    for (let i = 0; i < 250; i++) {
      simulation.tick();
    }

    simNodes.forEach((n) => cache.set(n.id, { x: n.x, y: n.y }));

    const flowNodes: Node[] = nodes.map((node) => {
      const pos = cache.get(node.id)!;
      return {
        id: node.id,
        type: node.type === 'IMAGE' ? 'image' : 'entity',
        position: pos,
        data: {
          ...node,
          label: node.label || node.name,
        },
      };
    });

    setNodes(flowNodes);
  }, [nodes, edges, setNodes]);

  // Convert our edges to ReactFlow format
  useEffect(() => {
    if (edges.length === 0) {
      setEdges([]);
      return;
    }

    const flowEdges: Edge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'straight',
      label: '',
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
          The PDF parser didn&apos;t find any entities (people, organizations, locations) in the document.
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
