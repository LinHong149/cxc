'use client';

import React, { useCallback } from 'react';
import { format, parseISO } from 'date-fns';

interface TimelineSliderProps {
  startDate: string | null;
  endDate: string | null;
  minDate?: string | null;
  maxDate?: string | null;
  onDateRangeChange: (start: string | null, end: string | null) => void;
}

export default function TimelineSlider({
  startDate,
  endDate,
  minDate,
  maxDate,
  onDateRangeChange,
}: TimelineSliderProps) {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value || null;
      onDateRangeChange(value, endDate);
    },
    [endDate, onDateRangeChange]
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value || null;
      onDateRangeChange(startDate, value);
    },
    [startDate, onDateRangeChange]
  );

  const clearFilters = useCallback(() => {
    onDateRangeChange(null, null);
  }, [onDateRangeChange]);

  return (
    <div
      style={{
        background: '#fef9e7',
        padding: '20px',
        borderRadius: '8px',
        border: '2px solid #8b6f47',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
        marginBottom: '20px',
        fontFamily: "'Courier New', monospace",
        position: 'relative',
      }}
    >
      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '700', color: '#654321', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📅 Timeline Filter
        </h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '5px',
              }}
            >
              Start Date
            </label>
            <input
              type="date"
              value={startDate || ''}
              onChange={handleStartChange}
              min={minDate || undefined}
              max={maxDate || undefined}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            {startDate && (
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                {formatDate(startDate)}
              </div>
            )}
          </div>

          <div style={{ flex: '1', minWidth: '200px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '5px',
              }}
            >
              End Date
            </label>
            <input
              type="date"
              value={endDate || ''}
              onChange={handleEndChange}
              min={minDate || startDate || undefined}
              max={maxDate || undefined}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            {endDate && (
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                {formatDate(endDate)}
              </div>
            )}
          </div>

          {(startDate || endDate) && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={clearFilters}
                style={{
                  padding: '8px 16px',
                  background: '#8b6f47',
                  color: '#fef9e7',
                  border: '2px solid #654321',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '700',
                  fontFamily: "'Courier New', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                ✕ Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {(minDate || maxDate) && (
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>
          Data range: {formatDate(minDate)} - {formatDate(maxDate)}
        </div>
      )}
    </div>
  );
}
