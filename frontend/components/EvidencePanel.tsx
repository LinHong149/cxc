'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';

interface Evidence {
  doc_id: string;
  page_id: string;
  snippet: string;
  timestamp?: string;
}

interface Source {
  source_id: string;
  title?: string;
  file_name?: string;
  page_labels?: Record<string, string>;
}

interface EvidencePanelProps {
  title: string;
  evidence: Evidence[];
  sources?: Source[];
  onClose: () => void;
}

export default function EvidencePanel({ title, evidence, sources, onClose }: EvidencePanelProps) {
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'No date';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getSourceTitle = (docId: string) => {
    const src = sources?.find((s) => s.source_id === docId);
    return src?.title || src?.file_name || docId;
  };

  const getPageLabel = (docId: string, pageNum: string) => {
    const src = sources?.find((s) => s.source_id === docId);
    const num = parseInt(pageNum, 10);
    const label = src?.page_labels?.[pageNum] ?? src?.page_labels?.[String(num)];
    return label ?? `Page ${isNaN(num) ? pageNum : num}`;
  };

  const getPageNum = (pageId: string) => {
    return pageId.includes('#p') ? pageId.split('#p')[1] : pageId;
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: '400px',
        height: '100vh',
        background: '#fef9e7',
        borderLeft: '3px solid #8b6f47',
        boxShadow: '-4px 0 12px rgba(0,0,0,0.3)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Courier New', monospace",
      }}
    >
      <div
        style={{
          padding: '20px',
          borderBottom: '2px solid #8b6f47',
          background: '#fffef0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#654321', fontFamily: "'Courier New', monospace" }}>
          📋 {title}
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '0',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}
      >
        {evidence.length === 0 ? (
          <div style={{ color: '#6b7280', textAlign: 'center', marginTop: '40px' }}>
            No evidence available
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {evidence.map((item, index) => (
              <div
                key={index}
                className="evidence-file"
                style={{
                  padding: '15px',
                  background: '#fffef0',
                  borderRadius: '4px',
                  border: '1px solid #8b6f47',
                  borderLeft: '4px solid #8b6f47',
                  marginBottom: '12px',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#654321',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #8b6f47',
                    paddingBottom: '6px',
                  }}
                >
                  📄 {getSourceTitle(item.doc_id)} • {getPageLabel(item.doc_id, getPageNum(item.page_id))}
                  {item.timestamp && ` • ${formatDate(item.timestamp)}`}
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.7', color: '#2c1810', fontFamily: "'Courier New', monospace" }}>
                  {item.snippet ? (
                    <>&ldquo;{item.snippet}&rdquo;</>
                  ) : (
                    <span style={{ fontStyle: 'italic', color: '#6b7280' }}>No excerpt</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
