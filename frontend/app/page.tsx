'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse PDF');
      }

      // Toggle to the other output file when a new file is uploaded
      if (typeof window !== 'undefined') {
        const currentFile = localStorage.getItem('selectedOutputFile') || 'output.json';
        const newFile = currentFile === 'output.json' ? 'output2.json' : 'output.json';
        localStorage.setItem('selectedOutputFile', newFile);
      }

      // Redirect to results page - the results page will read from localStorage
      router.push('/results');
      router.refresh(); // Force refresh to pick up localStorage changes
    } catch (err: any) {
      setError(err.message || 'An error occurred while uploading the file');
    } finally {
      setUploading(false);
    }
  };

  const handleViewExisting = () => {
    router.push('/results');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#D7AB7C',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Courier New', monospace",
      }}
      className="detective-board-bg"
    >
      <div
        style={{
          background: '#fef9e7',
          borderRadius: '8px',
          padding: '40px',
          maxWidth: '600px',
          width: '100%',
          border: '3px solid #8b6f47',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '64px', marginBottom: '16px' }} />
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#654321',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Timeline Detective Board
          </h1>
          <p style={{ fontSize: '14px', color: '#8b6f47', fontWeight: '600' }}>
            View case documents and toggle between different case files
          </p>
        </div>

        <div
          style={{
            border: '3px dashed #8b6f47',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            marginBottom: '20px',
            background: '#fffef0',
            transition: 'all 0.3s',
            borderStyle: 'dashed',
          }}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            style={{
              display: 'block',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#654321', marginBottom: '8px', fontFamily: "'Courier New', monospace" }}>
              {file ? file.name : 'Click to select PDF file'}
            </div>
            <div style={{ fontSize: '12px', color: '#8b6f47', fontWeight: '600' }}>
              {file ? 'Click again to change file' : 'or drag and drop'}
            </div>
          </label>
        </div>

        {error && (
          <div
            style={{
              background: '#fffef0',
              color: '#8b4513',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '13px',
              border: '2px solid #8b4513',
              fontFamily: "'Courier New', monospace",
              fontWeight: '600',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              flex: 1,
              padding: '14px 24px',
              background: uploading ? '#9ca3af' : '#8b6f47',
              color: '#fef9e7',
              border: '2px solid #654321',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: uploading || !file ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Courier New', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {uploading ? '⏳ Uploading...' : '📄 Upload File'}
          </button>
          <button
            onClick={handleViewExisting}
            style={{
              padding: '14px 24px',
              background: '#fef9e7',
              color: '#8b6f47',
              border: '2px solid #8b6f47',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Courier New', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            🔍 View Case Files
          </button>
        </div>

        <div style={{ marginTop: '30px', paddingTop: '30px', borderTop: '2px solid #8b6f47' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#654321', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📋 Case Analysis Features:
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ padding: '8px 0', fontSize: '13px', color: '#8b6f47', fontWeight: '600', fontFamily: "'Courier New', monospace" }}>
              ✓ Extracts people, organizations, and locations from documents
            </li>
            <li style={{ padding: '8px 0', fontSize: '13px', color: '#8b6f47', fontWeight: '600', fontFamily: "'Courier New', monospace" }}>
              ✓ Builds relationship graphs based on co-mentions
            </li>
            <li style={{ padding: '8px 0', fontSize: '13px', color: '#8b6f47', fontWeight: '600', fontFamily: "'Courier New', monospace" }}>
              ✓ Provides timeline filtering to explore connections over time
            </li>
            <li style={{ padding: '8px 0', fontSize: '13px', color: '#8b6f47', fontWeight: '600', fontFamily: "'Courier New', monospace" }}>
              ✓ Shows evidence citations for every connection
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
