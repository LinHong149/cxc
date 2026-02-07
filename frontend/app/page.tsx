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

      // Redirect to results page
      router.push('/results');
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '10px',
            }}
          >
            🕵️ Timeline Detective Board
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            Upload documents to extract entities and build an interactive investigation graph
          </p>
        </div>

        <div
          style={{
            border: '2px dashed #d1d5db',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            marginBottom: '20px',
            background: '#f9fafb',
            transition: 'all 0.3s',
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
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
              {file ? file.name : 'Click to select PDF file'}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {file ? 'Click again to change file' : 'or drag and drop'}
            </div>
          </label>
        </div>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              flex: 1,
              padding: '14px 24px',
              background: uploading ? '#9ca3af' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: uploading || !file ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {uploading ? 'Processing...' : 'Upload & Parse'}
          </button>
          <button
            onClick={handleViewExisting}
            style={{
              padding: '14px 24px',
              background: 'white',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            View Existing
          </button>
        </div>

        <div style={{ marginTop: '30px', paddingTop: '30px', borderTop: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
            What this tool does:
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ padding: '8px 0', fontSize: '14px', color: '#6b7280' }}>
              ✓ Extracts people, organizations, and locations from documents
            </li>
            <li style={{ padding: '8px 0', fontSize: '14px', color: '#6b7280' }}>
              ✓ Builds relationship graphs based on co-mentions
            </li>
            <li style={{ padding: '8px 0', fontSize: '14px', color: '#6b7280' }}>
              ✓ Provides timeline filtering to explore connections over time
            </li>
            <li style={{ padding: '8px 0', fontSize: '14px', color: '#6b7280' }}>
              ✓ Shows evidence citations for every connection
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
