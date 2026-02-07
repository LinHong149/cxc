"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { parseISO } from "date-fns";
import TimelineSlider from "../components/TimelineSlider";
import EvidencePanel from "../components/EvidencePanel";
import type { GraphResponse, GraphNode, GraphEdge, EvidenceResponse } from "../types";

const GraphVisualization = dynamic(
  () => import("../components/GraphVisualization"),
  { ssr: false }
);

export default function Home() {
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceResponse | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const fetchGraphData = useCallback(async (dateStart?: Date, dateEnd?: Date) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateStart) params.append("date_start", dateStart.toISOString());
      if (dateEnd) params.append("date_end", dateEnd.toISOString());

      const response = await fetch(`/api/graph?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch graph data");
      }

      const data: GraphResponse = await response.json();
      setGraphData(data);

      // Initialize date range if not set
      setDateRange((prev) => {
        if (!prev && data.timeline_range) {
          const start = parseISO(data.timeline_range.start);
          const end = parseISO(data.timeline_range.end);
          return { start, end };
        }
        return prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  const handleTimelineChange = useCallback(
    (start: Date, end: Date) => {
      setDateRange({ start, end });
      fetchGraphData(start, end);
    },
    [fetchGraphData]
  );

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    setSelectedNode(node);
    setSelectedEvidence(null);
    setIsPanelOpen(true);
  }, []);

  const handleEdgeClick = useCallback(async (edge: GraphEdge) => {
    setSelectedNode(null);
    setIsPanelOpen(true);

    try {
      const response = await fetch(`/api/evidence?edge_id=${edge.id}`);
      if (response.ok) {
        const evidence: EvidenceResponse = await response.json();
        setSelectedEvidence(evidence);
      }
    } catch (err) {
      console.error("Failed to fetch evidence:", err);
    }
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedNode(null);
    setSelectedEvidence(null);
  }, []);

  if (loading && !graphData) {
    return (
      <div className="h-screen flex items-center justify-center bg-detective-dark">
        <div className="text-center">
          <div className="text-2xl font-semibold text-detective-text mb-2">
            Loading Detective Board...
          </div>
          <div className="text-sm text-detective-muted">Analyzing documents...</div>
        </div>
      </div>
    );
  }

  if (error && !graphData) {
    return (
      <div className="h-screen flex items-center justify-center bg-detective-dark">
        <div className="text-center">
          <div className="text-2xl font-semibold text-red-400 mb-2">Error</div>
          <div className="text-sm text-detective-muted mb-4">{error}</div>
          <button
            onClick={() => fetchGraphData()}
            className="px-4 py-2 bg-detective-accent text-white rounded hover:bg-detective-accent/80 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!graphData) return null;

  const timelineStart = dateRange?.start || parseISO(graphData.timeline_range.start);
  const timelineEnd = dateRange?.end || parseISO(graphData.timeline_range.end);

  return (
    <div className="h-screen flex flex-col bg-detective-dark">
      {/* Header */}
      <header className="bg-detective-board border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-detective-text">
              🕵️ Timeline Detective Board
            </h1>
            <p className="text-sm text-detective-muted mt-1">
              Document Entity Graph Explorer
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-detective-text">
              {graphData.nodes.length} entities
            </div>
            <div className="text-xs text-detective-muted">
              {graphData.edges.length} connections
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline Slider */}
        <div className="bg-detective-board border-b border-gray-700 p-4">
          <TimelineSlider
            startDate={parseISO(graphData.timeline_range.start)}
            endDate={parseISO(graphData.timeline_range.end)}
            currentStart={timelineStart}
            currentEnd={timelineEnd}
            onRangeChange={handleTimelineChange}
          />
        </div>

        {/* Graph Visualization */}
        <div className="flex-1 relative">
          <GraphVisualization
            nodes={graphData.nodes}
            edges={graphData.edges}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
          />

          {/* Evidence Panel */}
          {isPanelOpen && (
            <EvidencePanel
              evidence={selectedEvidence}
              node={selectedNode}
              onClose={handleClosePanel}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-detective-board border-t border-gray-700 px-6 py-2">
        <div className="text-xs text-detective-muted text-center">
          Connections represent textual co-occurrence only. Appearance in documents ≠ wrongdoing.
        </div>
      </footer>
    </div>
  );
}
