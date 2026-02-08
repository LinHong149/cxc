'use client';

import React, { useState, useRef, useEffect } from 'react';

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  selectedNodes: GraphNode[];
  edges?: GraphEdge[];
  onClose: () => void;
}

export default function ChatPanel({ selectedNodes, edges = [], onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (selectedNodes.length === 0) {
      alert('Please select at least one node to ask a question about.');
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: input,
          selectedNodes: selectedNodes.map((node) => ({
            id: node.id,
            name: node.name,
            label: node.label || node.name,
            type: node.type,
            mention_count: node.mention_count,
            first_seen: node.first_seen,
            last_seen: node.last_seen,
            documents: node.documents,
          })),
          edges: edges,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response from AI'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '400px',
        height: '600px',
        background: '#fef9e7',
        border: '3px solid #8b6f47',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Courier New', monospace",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '2px solid #8b6f47',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fff8dc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
          <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '700',
                color: '#654321',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Chat with Combs
            </h3>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '11px',
                color: '#8b6f47',
                fontWeight: '600',
              }}
            >
              {selectedNodes.length} {selectedNodes.length === 1 ? 'node' : 'nodes'} selected
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#8b6f47',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#8b6f47';
            e.currentTarget.style.color = '#fef9e7';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#8b6f47';
          }}
        >
          ×
        </button>
      </div>

      {/* Selected nodes info */}
      {selectedNodes.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fffef0',
            borderBottom: '1px solid #8b6f47',
            fontSize: '11px',
            color: '#654321',
            maxHeight: '80px',
            overflowY: 'auto',
          }}
        >
          <div style={{ fontWeight: '700', marginBottom: '4px' }}>Selected:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {Array.from(new Map(selectedNodes.map((n) => [n.id, n])).values()).map((node) => (
              <span
                key={node.id}
                style={{
                  background: '#8b6f47',
                  color: '#fef9e7',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: '600',
                }}
              >
                {node.label || node.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#8b6f47',
              fontSize: '13px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              Ask a question about the selected nodes
            </div>
            <div style={{ fontSize: '11px' }}>
              {selectedNodes.length === 0
                ? 'Click on nodes in the graph to add them'
                : 'Try asking: "What is the relationship between these entities?"'}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: '8px',
                maxWidth: '100%',
              }}
            >
              {message.role === 'assistant' && (
                <img src="/logo.png" alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
              )}
              <div
                style={{
                  background: message.role === 'user' ? '#8b6f47' : '#fff8dc',
                  color: message.role === 'user' ? '#fef9e7' : '#654321',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  maxWidth: '85%',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  border:
                    message.role === 'user'
                      ? 'none'
                      : '1px solid #8b6f47',
                  boxShadow:
                    message.role === 'user'
                      ? '0 2px 4px rgba(0,0,0,0.2)'
                      : 'none',
                }}
              >
                {message.content}
              </div>
            </div>
            <div
              style={{
                fontSize: '10px',
                color: '#8b6f47',
                marginTop: '4px',
                padding: '0 4px',
              }}
            >
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}

        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
            }}
          >
            <img src="/logo.png" alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
            <div
              style={{
                background: '#fff8dc',
                color: '#654321',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                border: '1px solid #8b6f47',
              }}
            >
              <span style={{ display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }}>
                Thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '16px',
          borderTop: '2px solid #8b6f47',
          background: '#fffef0',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              selectedNodes.length === 0
                ? 'Click nodes in the graph to add them first...'
                : 'Ask a question about the selected nodes...'
            }
            disabled={loading || selectedNodes.length === 0}
            style={{
              flex: 1,
              padding: '10px',
              border: '2px solid #8b6f47',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: "'Courier New', monospace",
              resize: 'none',
              minHeight: '60px',
              maxHeight: '120px',
              background: selectedNodes.length === 0 ? '#f5f5f5' : '#fef9e7',
              color: '#654321',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || selectedNodes.length === 0}
            style={{
              padding: '10px 16px',
              background:
                !input.trim() || loading || selectedNodes.length === 0
                  ? '#9ca3af'
                  : '#8b6f47',
              color: '#fef9e7',
              border: '2px solid #654321',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '700',
              cursor:
                !input.trim() || loading || selectedNodes.length === 0
                  ? 'not-allowed'
                  : 'pointer',
              fontFamily: "'Courier New', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.2s',
            }}
          >
            Send
          </button>
        </div>
        <div
          style={{
            fontSize: '10px',
            color: '#8b6f47',
            marginTop: '6px',
            textAlign: 'center',
          }}
        >
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
