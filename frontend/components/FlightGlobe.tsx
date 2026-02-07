'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { format, parseISO } from 'date-fns';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

export interface FlightArc {
  id: string;
  event_id: string;
  title: string;
  date: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startName: string;
  endName: string;
  participants?: string[];
  summary?: string;
  source_refs?: Array<{ source_id: string; page: number; evidence?: string }>;
}

interface FlightGlobeProps {
  timelineStart?: string | null;
  timelineEnd?: string | null;
  selectedFile?: string;
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

const ARC_COLORS = ['#c44900', '#8b4513', '#654321', '#a0522d', '#cd853f'];

export default function FlightGlobe({
  timelineStart,
  timelineEnd,
  selectedFile = 'output.json',
}: FlightGlobeProps) {
  const [flights, setFlights] = useState<FlightArc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (timelineStart) params.append('date_start', timelineStart);
      if (timelineEnd) params.append('date_end', timelineEnd);
      params.append('file', selectedFile);

      const res = await fetch(`/api/flights?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to load flights');

      setFlights(data.flights || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flights');
      setFlights([]);
    } finally {
      setLoading(false);
    }
  }, [timelineStart, timelineEnd, selectedFile]);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  const arcsData = flights.map((f, i) => ({
    ...f,
    color: ARC_COLORS[i % ARC_COLORS.length],
  }));

  if (loading) {
    return (
      <div
        style={{
          height: '100%',
          minHeight: '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(254, 249, 231, 0.6)',
          borderRadius: '8px',
          border: '2px solid #8b6f47',
          fontFamily: "'Courier New', monospace",
        }}
      >
        <div style={{ textAlign: 'center', color: '#654321' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✈️</div>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Loading flights...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          background: 'rgba(254, 249, 231, 0.9)',
          borderRadius: '8px',
          border: '2px solid #8b6f47',
          fontFamily: "'Courier New', monospace",
          color: '#654321',
          fontSize: '12px',
        }}
      >
        <div style={{ marginBottom: '8px' }}>⚠️ {error}</div>
        <button
          onClick={fetchFlights}
          style={{
            padding: '6px 12px',
            background: '#8b6f47',
            color: '#fef9e7',
            border: '2px solid #654321',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: '700',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: "'Courier New', monospace",
      }}
    >
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#654321', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        ✈️ Flight Tracker
      </h3>

      {/* 3D Globe */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '220px',
          background: '#0a1628',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '2px solid #8b6f47',
        }}
      >
        <Globe
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
          arcsData={arcsData}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcStroke={0.4}
          arcAltitude={0.25}
          arcDashLength={0.5}
          arcDashGap={0.2}
          arcDashAnimateTime={3000}
          arcLabel={(d: FlightArc & { color: string }) =>
            `${d.title}: ${d.startName} → ${d.endName}`
          }
          showAtmosphere={true}
          atmosphereColor="#87ceeb"
          atmosphereAltitude={0.15}
          enablePointerInteraction={true}
          width={280}
          height={220}
        />
      </div>

      {/* Flight list */}
      <div
        style={{
          maxHeight: '180px',
          overflowY: 'auto',
          background: 'rgba(254, 249, 231, 0.8)',
          borderRadius: '6px',
          border: '2px solid #8b6f47',
          padding: '8px',
        }}
      >
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#654321', marginBottom: '8px', textTransform: 'uppercase' }}>
          Flight Records ({flights.length})
        </div>
        {flights.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#8b6f47', padding: '8px 0' }}>
            No flight records in this date range.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {flights.map((f, i) => (
              <div
                key={f.id}
                style={{
                  padding: '8px 10px',
                  background: '#fef9e7',
                  border: `2px solid ${ARC_COLORS[i % ARC_COLORS.length]}`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#2c1810',
                }}
              >
                <div style={{ fontWeight: '700', marginBottom: '4px' }}>{f.title}</div>
                <div style={{ color: '#654321', marginBottom: '2px' }}>
                  {formatDate(f.date)}
                </div>
                <div style={{ color: '#6b4423', fontSize: '10px' }}>
                  {f.startName} → {f.endName}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
