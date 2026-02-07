"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import type { GraphNode, GraphEdge } from "@/types";

interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
}

const nodeTypes = {
  person: ({ data }: { data: any }) => (
    <div className="px-3 py-2 bg-red-600/20 border-2 border-red-500 rounded-lg shadow-lg">
      <div className="text-sm font-semibold text-red-300">{data.label}</div>
      <div className="text-xs text-red-400/70 mt-1">{data.type}</div>
    </div>
  ),
  org: ({ data }: { data: any }) => (
    <div className="px-3 py-2 bg-blue-600/20 border-2 border-blue-500 rounded-lg shadow-lg">
      <div className="text-sm font-semibold text-blue-300">{data.label}</div>
      <div className="text-xs text-blue-400/70 mt-1">{data.type}</div>
    </div>
  ),
  gpe: ({ data }: { data: any }) => (
    <div className="px-3 py-2 bg-green-600/20 border-2 border-green-500 rounded-lg shadow-lg">
      <div className="text-sm font-semibold text-green-300">{data.label}</div>
      <div className="text-xs text-green-400/70 mt-1">{data.type}</div>
    </div>
  ),
  date: ({ data }: { data: any }) => (
    <div className="px-3 py-2 bg-yellow-600/20 border-2 border-yellow-500 rounded-lg shadow-lg">
      <div className="text-sm font-semibold text-yellow-300">{data.label}</div>
      <div className="text-xs text-yellow-400/70 mt-1">{data.type}</div>
    </div>
  ),
};

export default function GraphVisualization({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
}: GraphVisualizationProps) {
  const reactFlowNodes = useMemo<Node[]>(() => {
    return nodes.map((node, idx) => {
      const type = node.type.toLowerCase() as "person" | "org" | "gpe" | "date";
      return {
        id: node.id,
        type: type,
        position: {
          x: Math.random() * 800 + 100,
          y: Math.random() * 600 + 100,
        },
        data: {
          ...node,
          label: node.label,
        },
      };
    });
  }, [nodes]);

  const reactFlowEdges = useMemo<Edge[]>(() => {
    return edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: `${edge.label} (${edge.weight})`,
      type: "smoothstep",
      animated: true,
      style: {
        stroke: "#4ecdc4",
        strokeWidth: Math.min(edge.weight, 5),
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#4ecdc4",
      },
      data: edge,
    }));
  }, [edges]);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const graphNode = nodes.find((n) => n.id === node.id);
      if (graphNode && onNodeClick) {
        onNodeClick(graphNode);
      }
    },
    [nodes, onNodeClick]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const graphEdge = edges.find((e) => e.id === edge.id);
      if (graphEdge && onEdgeClick) {
        onEdgeClick(graphEdge);
      }
    },
    [edges, onEdgeClick]
  );

  return (
    <div className="w-full h-full bg-detective-dark">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-detective-dark"
      >
        <Background color="#333" gap={16} />
        <Controls className="bg-detective-board border border-gray-700" />
        <MiniMap
          className="bg-detective-board border border-gray-700"
          nodeColor={(node) => {
            const type = node.type || "default";
            const colors: Record<string, string> = {
              person: "#ef4444",
              org: "#3b82f6",
              gpe: "#22c55e",
              date: "#eab308",
            };
            return colors[type] || "#666";
          }}
        />
      </ReactFlow>
    </div>
  );
}
