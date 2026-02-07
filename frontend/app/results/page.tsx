'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import GraphVisualization from '@/components/GraphVisualization';
import TimelineSlider from '@/components/TimelineSlider';
import EvidencePanel from '@/components/EvidencePanel';

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

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  timeline_range: {
    start: string | null;
    end: string | null;
  };
}

export default function ResultsPage() {
  const router = useRouter();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState<string | null>(null);
  const [dateEnd, setDateEnd] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateStart) params.append('date_start', dateStart);
      if (dateEnd) params.append('date_end', dateEnd);

      const response = await fetch(`/api/graph?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load graph data');
      }

      setGraphData(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [dateStart, dateEnd]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  const handleDateRangeChange = useCallback((start: string | null, end: string | null) => {
    setDateStart(start);
    setDateEnd(end);
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setShowEvidence(true);
  }, []);

  const handleEdgeClick = useCallback((edge: GraphEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setShowEvidence(true);
  }, []);

  const handleCloseEvidence = useCallback(() => {
    setShowEvidence(false);
    setSelectedEdge(null);
    setSelectedNode(null);
  }, []);

  const getEvidenceData = () => {
    if (selectedEdge) {
      return {
        title: `Connection Evidence (${selectedEdge.evidence.length} citations)`,
        evidence: selectedEdge.evidence,
      };
    }
    if (selectedNode && graphData) {
      // Find all edges connected to this node
      const connectedEdges = graphData.edges.filter(
        (e) => e.source === selectedNode.id || e.target === selectedNode.id
      );
      const allEvidence = connectedEdges.flatMap((e) => e.evidence);
      return {
        title: `${selectedNode.label || selectedNode.name} - All Mentions (${allEvidence.length} citations)`,
        evidence: allEvidence,
      };
    }
    return { title: 'Evidence', evidence: [] };
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🕵️</div>
          <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading investigation board...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          padding: '20px',
        }}
      >
        <div
          style={{
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
            Error Loading Data
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>{error}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '10px 20px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Upload PDF
            </button>
            <button
              onClick={fetchGraphData}
              style={{
                padding: '10px 20px',
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          padding: '20px',
        }}
      >
        <div
          style={{
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
            No Data Available
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
            Please upload and parse a PDF file first to see the investigation graph.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '12px 24px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Upload PDF
          </button>
        </div>
      </div>
    );
  }

  const evidenceData = getEvidenceData();

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: 'white',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
            🕵️ Timeline Detective Board
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            {graphData.nodes.length} entities • {graphData.edges.length} connections
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Upload New PDF
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px' }}>
          <TimelineSlider
            startDate={dateStart}
            endDate={dateEnd}
            minDate={graphData.timeline_range.start}
            maxDate={graphData.timeline_range.end}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>

        <div
          style={{
            flex: 1,
            position: 'relative',
            margin: '0 20px 20px 20px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            minHeight: '600px',
            height: 'calc(100vh - 300px)',
          }}
        >
          <GraphVisualization
            nodes={graphData.nodes}
            edges={graphData.edges}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
          />
        </div>
      </div>

      {showEvidence && (
        <EvidencePanel
          title={evidenceData.title}
          evidence={evidenceData.evidence}
          onClose={handleCloseEvidence}
        />
      )}
    </div>
  );
}
