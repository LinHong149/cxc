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
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px',
      }}
    >
      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600' }}>
          Timeline Filter
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
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Clear
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
