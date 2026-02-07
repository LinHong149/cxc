'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';

interface Evidence {
  doc_id: string;
  page_id: string;
  snippet: string;
  timestamp?: string;
}

interface EvidencePanelProps {
  title: string;
  evidence: Evidence[];
  onClose: () => void;
}

export default function EvidencePanel({ title, evidence, onClose }: EvidencePanelProps) {
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'No date';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: '400px',
        height: '100vh',
        background: 'white',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{title}</h2>
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
                style={{
                  padding: '15px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: '8px',
                  }}
                >
                  {item.doc_id} • Page {item.page_id.split('#p')[1]}
                  {item.timestamp && ` • ${formatDate(item.timestamp)}`}
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#1f2937' }}>
                  {item.snippet}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
