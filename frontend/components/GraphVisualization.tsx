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
  geo?: { lat?: number; lng?: number; city?: string; country?: string; admin_area?: string; neighborhood?: string };
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
  selectedNodeIds?: Set<string>;
  onNodeSelectionChange?: (selectedIds: Set<string>) => void;
  /** When true, single-click toggles selection instead of clearing. Used for chat node selection. */
  singleClickTogglesSelection?: boolean;
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

// Custom node component - Detective Board Style
const EntityNode = ({ data, selected }: { data: GraphNode; selected?: boolean }) => {
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
        background: selected ? '#fff8dc' : '#fef9e7',
        border: `3px solid ${selected ? '#ff6b35' : color}`,
        borderRadius: '4px',
        padding: '12px 16px',
        minWidth: '140px',
        boxShadow: selected
          ? '0 6px 12px rgba(255, 107, 53, 0.4), 0 0 0 2px rgba(255, 107, 53, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
          : '0 4px 8px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(139, 111, 71, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        position: 'relative',
        fontFamily: "'Courier New', monospace",
        transform: selected ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.2s ease',
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

// Location/place node with embedded map
const PlaceNode = ({ data }: { data: GraphNode }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{ remove: () => void } | null>(null);

  const loc = data.geo;
  const lat = loc?.lat ?? 40.7128;
  const lng = loc?.lng ?? -74.006;
  const hasCoords = loc?.lat != null && loc?.lng != null;
  const locationLine = [loc?.neighborhood, loc?.city, loc?.admin_area, loc?.country]
    .filter(Boolean)
    .join(', ');

  useEffect(() => {
    const container = mapRef.current;
    if (!container || typeof window === 'undefined') return;

    let mounted = true;
    import('leaflet').then((L) => {
      if (!mounted || !container) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(container, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
        doubleClickZoom: false,
      }).setView([lat, lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      L.marker([lat, lng]).addTo(map);
      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng]);

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #fef9e7 0%, #f5ecd6 100%)',
        border: '2px solid #6b4423',
        borderRadius: '6px',
        padding: '8px',
        minWidth: '180px',
        maxWidth: '220px',
        boxShadow:
          '0 4px 8px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(107, 68, 35, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        position: 'relative',
        fontFamily: "'Courier New', monospace",
      }}
    >
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
      <Handle type="target" position={Position.Top} style={{ background: '#6b4423', width: '8px', height: '8px' }} />
      <div style={{ textAlign: 'center' }}>
        {hasCoords && (
          <div
            ref={mapRef}
            className="place-node-map"
            style={{
              width: '100%',
              height: '100px',
              borderRadius: '4px',
              overflow: 'hidden',
              background: '#e8dcc8',
              marginBottom: '8px',
            }}
          />
        )}
        <div
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#6b4423',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          LOCATION
        </div>
        <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px', color: '#2c1810' }}>
          {data.label || data.name}
        </div>
        {locationLine && (
          <div style={{ fontSize: '10px', color: '#8b6f47', marginBottom: '4px', lineHeight: 1.3 }}>
            {locationLine}
          </div>
        )}
        <div style={{ fontSize: '10px', color: '#6b4423', borderTop: '1px solid #8b6f47', paddingTop: '6px', marginTop: '6px' }}>
          {data.mention_count} {data.mention_count === 1 ? 'mention' : 'mentions'}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#6b4423', width: '8px', height: '8px' }} />
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
  place: PlaceNode,
};

export default function GraphVisualization({
  nodes,
  edges,
  timelineRange,
  onNodeClick,
  onEdgeClick,
  selectedNodeIds = new Set(),
  onNodeSelectionChange,
  singleClickTogglesSelection = false,
}: GraphVisualizationProps) {
  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const positionCache = useRef<Map<string, { x: number; y: number }>>(new Map());
  const cacheKeyRef = useRef<string>('');

  // Get cache key based on selected file
  const getCacheKey = useCallback(() => {
    if (typeof window === 'undefined') return 'nodePositions_output.json';
    const fileKey = localStorage.getItem('selectedOutputFile') || 'output.json';
    return `nodePositions_${fileKey}`;
  }, []);

  // Load positions from localStorage
  const loadPositionsFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const key = getCacheKey();
    cacheKeyRef.current = key;
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const positions = JSON.parse(stored) as Record<string, { x: number; y: number }>;
        // Only load positions for nodes that currently exist
        const validPositions: Record<string, { x: number; y: number }> = {};
        nodes.forEach(node => {
          if (positions[node.id]) {
            validPositions[node.id] = positions[node.id];
          }
        });
        positionCache.current = new Map(Object.entries(validPositions));
      }
    } catch (e) {
      console.warn('Failed to load node positions from localStorage', e);
    }
  }, [nodes, getCacheKey]);

  // Save positions to localStorage
  const savePositionsToStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const key = getCacheKey();
    cacheKeyRef.current = key;
    
    try {
      // Load existing positions first to preserve positions for nodes not currently visible
      let existingPositions: Record<string, { x: number; y: number }> = {};
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          existingPositions = JSON.parse(stored);
        }
      } catch (e) {
        // Ignore parse errors for existing data
      }
      
      // Update with current positions
      positionCache.current.forEach((pos, nodeId) => {
        existingPositions[nodeId] = pos;
      });
      
      localStorage.setItem(key, JSON.stringify(existingPositions));
    } catch (e) {
      console.warn('Failed to save node positions to localStorage', e);
    }
  }, [getCacheKey]);

  // Load positions when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      loadPositionsFromStorage();
    }
  }, [loadPositionsFromStorage]);

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
    const cache = positionCache.current;

    const getCollisionRadius = (node: GraphNode) => {
      if (node.type === 'IMAGE') return 65;
      if (node.type === 'GPE') return 130;
      return 120;
    };

    const imageIds = new Set(nodes.filter((n) => n.type === 'IMAGE').map((n) => n.id));

    // Check if all nodes have cached positions
    const allNodesHaveCache = nodes.every((node) => cache.has(node.id));

    const simNodes = nodes.map((node) => {
      const cached = cache.get(node.id);
      return {
        id: node.id,
        x: cached?.x ?? CENTER_X + (Math.random() - 0.5) * 400,
        y: cached?.y ?? CENTER_Y + (Math.random() - 0.5) * 400,
        radius: getCollisionRadius(node),
      };
    });

    // Only run simulation if not all nodes have cached positions
    // This preserves manual layouts and prevents rearrangement on reload
    if (!allNodesHaveCache) {
      const simLinks = edges.map((e) => ({
        source: e.source,
        target: e.target,
      }));

      const simulation = forceSimulation(simNodes)
        .force(
          'link',
          forceLink(simLinks)
            .id((d) => (d as { id: string }).id)
            .distance((link) => {
              const src = link.source as { id?: string };
              const tgt = link.target as { id?: string };
              const sourceId = src?.id ?? String(link.source);
              const targetId = tgt?.id ?? String(link.target);
              const involvesImage = imageIds.has(sourceId) || imageIds.has(targetId);
              return involvesImage ? 120 : 250;
            })
            .strength((link) => {
              const src = link.source as { id?: string };
              const tgt = link.target as { id?: string };
              const sourceId = src?.id ?? String(link.source);
              const targetId = tgt?.id ?? String(link.target);
              const involvesImage = imageIds.has(sourceId) || imageIds.has(targetId);
              return involvesImage ? 1 : 0.6;
            })
        )
        .force('charge', forceManyBody().strength(-450))
        .force('center', forceCenter(CENTER_X, CENTER_Y))
        .force('collision', forceCollide<(typeof simNodes)[0]>().radius((d) => d.radius).iterations(5));

      for (let i = 0; i < 400; i++) {
        simulation.tick();
      }

      simNodes.forEach((n) => cache.set(n.id, { x: n.x, y: n.y }));
      
      // Save positions after simulation
      savePositionsToStorage();
    }

    const flowNodes: Node[] = nodes.map((node) => {
      const pos = cache.get(node.id)!;
      const nodeType =
        node.type === 'IMAGE' ? 'image' : node.type === 'GPE' ? 'place' : 'entity';
      return {
        id: node.id,
        type: nodeType,
        position: pos,
        data: {
          ...node,
          label: node.label || node.name,
        },
        selected: selectedNodeIds?.has(node.id) || false,
      };
    });

    setNodes(flowNodes);
  }, [nodes, edges, setNodes, selectedNodeIds, savePositionsToStorage]);

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

  // Wrap onNodesChange to save positions when nodes are dragged
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      
      // Save positions when nodes are dragged
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          const nodeId = change.id;
          positionCache.current.set(nodeId, change.position);
        }
      });
      
      // Debounce saving to avoid too many localStorage writes
      if (changes.some((c) => c.type === 'position')) {
        setTimeout(() => {
          savePositionsToStorage();
        }, 500);
      }
    },
    [onNodesChange, savePositionsToStorage]
  );

  const onNodeClickHandler = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const isToggleMode = event.ctrlKey || event.metaKey || singleClickTogglesSelection;
      if (isToggleMode && onNodeSelectionChange) {
        const newSelection = new Set(selectedNodeIds);
        if (newSelection.has(node.id)) {
          newSelection.delete(node.id);
        } else {
          newSelection.add(node.id);
        }
        onNodeSelectionChange(newSelection);
      } else if (!singleClickTogglesSelection) {
        // Single click without toggle mode: invoke handler and clear selection
        if (onNodeClick) {
          onNodeClick(node.data as GraphNode);
        }
        if (onNodeSelectionChange && selectedNodeIds.size > 0) {
          onNodeSelectionChange(new Set());
        }
      }
    },
    [onNodeClick, selectedNodeIds, onNodeSelectionChange, singleClickTogglesSelection]
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
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClickHandler}
          onEdgeClick={onEdgeClickHandler}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: 'transparent' }}
          nodesDraggable={true}
          nodesConnectable={false}
          selectNodesOnDrag={false}
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
