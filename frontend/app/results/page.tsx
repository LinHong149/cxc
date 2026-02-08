'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GraphVisualization from '@/components/GraphVisualization';
import TimelineSlider from '@/components/TimelineSlider';
import FlightGlobe from '@/components/FlightGlobe';
import EvidencePanel from '@/components/EvidencePanel';
import ChatPanel from '@/components/ChatPanel';

interface GraphNode {
  id: string;
  label?: string;
  name: string;
  type: string;
  mention_count: number;
  first_seen?: string;
  last_seen?: string;
  documents: string[];
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

interface GraphSource {
  source_id: string;
  title?: string;
  file_name?: string;
  page_labels?: Record<string, string>;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  sources?: GraphSource[];
  timeline_range: {
    start: string | null;
    end: string | null;
  };
}

function ResultsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timelineStart, setTimelineStart] = useState<string | null>(null);
  const [timelineEnd, setTimelineEnd] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [chatNodeIds, setChatNodeIds] = useState<Set<string>>(new Set());
  const [showChat, setShowChat] = useState(false);
  
  // File toggle state with localStorage persistence
  const [selectedFile, setSelectedFile] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedOutputFile') || 'output.json';
    }
    return 'output.json';
  });

  const hasLoadedOnce = useRef(false);

  // Sync with localStorage on mount and check for changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkAndUpdateFile = () => {
      const storedFile = localStorage.getItem('selectedOutputFile') || 'output.json';
      setSelectedFile((currentFile) => {
        if (storedFile !== currentFile) {
          hasLoadedOnce.current = false; // Force reload
          return storedFile;
        }
        return currentFile;
      });
    };

    // Check on mount and when navigating to this page
    checkAndUpdateFile();

    // Check periodically in case localStorage was updated (e.g., from upload)
    const interval = setInterval(checkAndUpdateFile, 200);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchGraphData = useCallback(async () => {
    const isInitial = !hasLoadedOnce.current;
    if (isInitial) setInitialLoading(true);
    else setGraphLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (timelineStart) params.append('date_start', timelineStart);
      if (timelineEnd) params.append('date_end', timelineEnd);
      params.append('file', selectedFile);

      const response = await fetch(`/api/graph?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load graph data');
      }

      setGraphData(data);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setInitialLoading(false);
      setGraphLoading(false);
    }
  }, [timelineStart, timelineEnd, selectedFile]);

  const handleFileToggle = useCallback(() => {
    const newFile = selectedFile === 'output.json' ? 'output2.json' : 'output.json';
    setSelectedFile(newFile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedOutputFile', newFile);
    }
    hasLoadedOnce.current = false; // Force reload
  }, [selectedFile]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  const handleTimelineChange = useCallback((start: string | null, end: string | null) => {
    setTimelineStart(start);
    setTimelineEnd(end);
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    // When chat is open, selection is handled by GraphVisualization via onNodeSelectionChange
    // When chat is closed: show evidence panel (unless doing multi-select)
    if (!showChat && selectedNodeIds.size === 0) {
      setSelectedNode(node);
      setSelectedEdge(null);
      setShowEvidence(true);
    }
  }, [showChat, selectedNodeIds]);

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

  const handleNodeSelectionChange = useCallback((selectedIds: Set<string>) => {
    if (showChat) {
      setChatNodeIds(selectedIds);
    } else {
      setSelectedNodeIds(selectedIds);
    }
  }, [showChat]);

  const selectedNodes = graphData
    ? graphData.nodes.filter((node) => selectedNodeIds.has(node.id))
    : [];

  const chatNodes = graphData
    ? graphData.nodes.filter((node) => chatNodeIds.has(node.id))
    : [];

  const handleOpenChat = useCallback(() => {
    setShowChat(true);
    setChatNodeIds(new Set());
  }, []);

  const handleCloseChat = useCallback(() => {
    setShowChat(false);
    setChatNodeIds(new Set());
  }, []);

  const getEvidenceData = () => {
    if (selectedEdge) {
      return {
        title: `Connection Evidence (${selectedEdge.evidence.length} citations)`,
        evidence: selectedEdge.evidence,
      };
    }
    if (selectedNode && graphData) {
      const connectedEdges = graphData.edges.filter(
        (e) => e.source === selectedNode.id || e.target === selectedNode.id
      );
      const allEvidence = connectedEdges.flatMap((e) => e.evidence);
      const seen = new Set<string>();
      const deduped = allEvidence.filter((ev) => {
        const key = `${ev.doc_id}|${ev.page_id}|${ev.snippet}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return {
        title: `${selectedNode.label || selectedNode.name} - All Mentions (${deduped.length} citations)`,
        evidence: deduped,
      };
    }
    return { title: 'Evidence', evidence: [] };
  };

  if (initialLoading) {
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
    <div style={{ height: '100vh', background: '#D7AB7C', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }} className="detective-board-bg">
      <header
        style={{
          background: '#fef9e7',
          padding: '16px 24px',
          borderBottom: '3px solid #8b6f47',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontFamily: "'Courier New', monospace",
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '40px' }} />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#654321', fontFamily: "'Courier New', monospace" }}>
              SHERLOCK COMBS
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8b6f47', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {graphData.nodes.length} {graphData.nodes.length === 1 ? 'ENTITY' : 'ENTITIES'} • {graphData.edges.length} {graphData.edges.length === 1 ? 'CONNECTION' : 'CONNECTIONS'}
            {selectedNodeIds.size > 0 && (
              <> • {selectedNodeIds.size} {selectedNodeIds.size === 1 ? 'SELECTED' : 'SELECTED'}</>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleFileToggle}
            style={{
              display: 'none',
              padding: '10px 20px',
              background: selectedFile === 'output2.json' ? '#654321' : '#8b6f47',
              color: '#fef9e7',
              border: '2px solid #654321',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: "'Courier New', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#654321';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = selectedFile === 'output2.json' ? '#654321' : '#8b6f47';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title={`Currently viewing: ${selectedFile}. Click to switch to ${selectedFile === 'output.json' ? 'output2.json' : 'output.json'}`}
          >
            📄 {selectedFile === 'output2.json' ? 'output2.json' : 'output.json'}
          </button>
          <button
            onClick={() => (showChat ? handleCloseChat() : handleOpenChat())}
            style={{
              padding: '10px 20px',
              background: showChat ? '#654321' : '#8b6f47',
              color: '#fef9e7',
              border: '2px solid #654321',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: "'Courier New', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              if (!showChat) {
                e.currentTarget.style.background = '#654321';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (!showChat) {
                e.currentTarget.style.background = '#8b6f47';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <img src="/logo.png" alt="Chat" style={{ height: '18px', verticalAlign: 'middle', marginRight: '6px' }} />
            {showChat ? 'Close Chat' : 'Chat'}
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '10px 20px',
              background: '#8b6f47',
              color: '#fef9e7',
              border: '2px solid #654321',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: "'Courier New', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#654321';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#8b6f47';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            📄 Upload New Case
          </button>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* Sidebar with Timeline Filter */}
        <div
          style={{
            width: '300px',
            background: '#fef9e7',
            borderRight: '3px solid #8b6f47',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          }}
        >
          <TimelineSlider
            startValue={timelineStart}
            endValue={timelineEnd}
            minDate={graphData.timeline_range.start}
            maxDate={graphData.timeline_range.end}
            onChange={handleTimelineChange}
          />

          <div style={{ marginTop: '20px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <FlightGlobe
              timelineStart={timelineStart}
              timelineEnd={timelineEnd}
              selectedFile={selectedFile}
            />
          </div>
        </div>

        {/* Main Graph Area */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            margin: '20px',
            background: 'transparent',
            borderRadius: '8px',
            border: '3px solid #8b6f47',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {/* Talking bear - only visible when chat is open, with faded edges mask */}
          {showChat && (
            <div
              className="bear-dance"
              style={{
                position: 'absolute',
                bottom: '70px',
                left: '60px',
                width: '120px',
                height: '120px',
                zIndex: 1,
                pointerEvents: 'none',
                maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 55%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 60% 60%, black 25%, transparent 100%)',
                maskSize: '100% 100%',
                WebkitMaskSize: '100% 100%',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
              }}
            >
              <img
                src="/talking_bear.gif"
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          )}
          {graphLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(215, 171, 124, 0.9)',
                borderRadius: '8px',
                zIndex: 10,
                fontFamily: "'Courier New', monospace",
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🕵️</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#654321', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Loading graph...
                </div>
              </div>
            </div>
          )}
          <GraphVisualization
            nodes={graphData.nodes}
            edges={graphData.edges}
            timelineRange={graphData.timeline_range}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            selectedNodeIds={showChat ? chatNodeIds : selectedNodeIds}
            onNodeSelectionChange={handleNodeSelectionChange}
            singleClickTogglesSelection={showChat}
          />
        </div>
      </div>

      {showEvidence && (
        <EvidencePanel
          title={evidenceData.title}
          evidence={evidenceData.evidence}
          sources={graphData?.sources}
          onClose={handleCloseEvidence}
        />
      )}

      {showChat && (
        <ChatPanel
          selectedNodes={chatNodes}
          edges={graphData?.edges || []}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#D7AB7C',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🕵️</div>
            <div style={{ fontSize: '18px', color: '#654321', fontFamily: "'Courier New', monospace" }}>
              Loading investigation board...
            </div>
          </div>
        </div>
      }
    >
      <ResultsPageContent />
    </Suspense>
  );
}
