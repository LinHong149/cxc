'use client';

import React, { useCallback, useMemo, useState, useRef } from 'react';
import { format, parseISO, addMonths, startOfMonth, isAfter } from 'date-fns';

interface TimelineSliderProps {
  startValue: string | null;
  endValue: string | null;
  minDate?: string | null;
  maxDate?: string | null;
  onChange: (start: string | null, end: string | null) => void;
}

function getMonthSteps(minStr: string, maxStr: string): string[] {
  const steps: string[] = [];
  let d = startOfMonth(parseISO(minStr));
  const max = parseISO(maxStr);
  while (!isAfter(d, max)) {
    steps.push(format(d, 'yyyy-MM-dd'));
    d = addMonths(d, 1);
  }
  return steps;
}

export default function TimelineSlider({
  startValue,
  endValue,
  minDate,
  maxDate,
  onChange,
}: TimelineSliderProps) {
  const formatMonthYear = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const monthSteps = useMemo(() => {
    if (!minDate || !maxDate) return [];
    try {
      return getMonthSteps(minDate, maxDate);
    } catch {
      return [];
    }
  }, [minDate, maxDate]);

  const stepCount = monthSteps.length;
  const sliderMax = Math.max(0, stepCount - 1);

  const valueToIndex = useCallback(
    (v: string | null, isEnd: boolean): number => {
      if (!v) return isEnd ? sliderMax : 0;
      const idx = monthSteps.indexOf(v);
      return idx >= 0 ? idx : isEnd ? sliderMax : 0;
    },
    [monthSteps, sliderMax]
  );

  const indexToValue = useCallback(
    (i: number): string | null => {
      if (i < 0 || i >= stepCount) return null;
      return monthSteps[i] ?? null;
    },
    [monthSteps, stepCount]
  );

  const startIndex = valueToIndex(startValue, false);
  const endIndex = valueToIndex(endValue, true);

  const clampedStartIndex = Math.min(startIndex, endIndex);
  const clampedEndIndex = Math.max(startIndex, endIndex);

  const [activeThumb, setActiveThumb] = useState<'start' | 'end'>('end');
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = sliderRef.current;
      if (!el || sliderMax === 0) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const startPos = clampedStartIndex / sliderMax;
      const endPos = clampedEndIndex / sliderMax;
      const mid = (startPos + endPos) / 2;
      setActiveThumb(x < mid ? 'start' : 'end');
    },
    [clampedStartIndex, clampedEndIndex, sliderMax]
  );

  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const i = Math.min(parseInt(e.target.value, 10), clampedEndIndex);
      const newStart = indexToValue(i);
      const newEnd = indexToValue(clampedEndIndex);
      onChange(newStart, newEnd);
    },
    [clampedEndIndex, indexToValue, onChange]
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const i = Math.max(parseInt(e.target.value, 10), clampedStartIndex);
      const newStart = indexToValue(clampedStartIndex);
      const newEnd = indexToValue(i);
      onChange(newStart, newEnd);
    },
    [clampedStartIndex, indexToValue, onChange]
  );

  const showAll = !startValue && !endValue;

  const handleShowAll = useCallback(() => {
    onChange(null, null);
  }, [onChange]);

  if (!minDate || !maxDate || stepCount === 0) {
    return (
      <div style={{ fontFamily: "'Courier New', monospace" }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '700', color: '#654321', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📅 Timeline
        </h3>
        <p style={{ fontSize: '12px', color: '#6b7280' }}>No date range available.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Courier New', monospace",
        position: 'relative',
      }}
    >
      <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '700', color: '#654321', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        📅 Timeline
      </h3>

      <div style={{ marginBottom: '12px' }}>
        <div
          ref={sliderRef}
          className="dual-range-slider"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setActiveThumb('end')}
          style={{
            position: 'relative',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <style>{`
            .dual-range-slider input[type="range"] {
              position: absolute;
              width: 100%;
              height: 12px;
              margin: 0;
              background: transparent;
              -webkit-appearance: none;
              appearance: none;
            }
            .dual-range-slider input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #8b6f47;
              border: 2px solid #654321;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .dual-range-slider input[type="range"]::-moz-range-thumb {
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #8b6f47;
              border: 2px solid #654321;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
          `}</style>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '8px',
              background: 'rgba(139, 111, 71, 0.3)',
              borderRadius: '4px',
            }}
          />
          {sliderMax > 0 && (
            <div
              style={{
                position: 'absolute',
                left: `${(clampedStartIndex / sliderMax) * 100}%`,
                width: `${((clampedEndIndex - clampedStartIndex) / sliderMax) * 100}%`,
                height: '8px',
                background: '#8b6f47',
                borderRadius: '4px',
                pointerEvents: 'none',
              }}
            />
          )}
          <input
            type="range"
            min={0}
            max={sliderMax}
            value={clampedStartIndex}
            onChange={handleStartChange}
            style={{ zIndex: activeThumb === 'start' ? 3 : 1 }}
          />
          <input
            type="range"
            min={0}
            max={sliderMax}
            value={clampedEndIndex}
            onChange={handleEndChange}
            style={{ zIndex: activeThumb === 'end' ? 3 : 1 }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '6px',
            fontSize: '11px',
            color: '#8b6f47',
            fontWeight: '600',
          }}
        >
          <span>{startValue ? formatMonthYear(startValue) : formatMonthYear(minDate)}</span>
          <span>{endValue ? formatMonthYear(endValue) : formatMonthYear(maxDate)}</span>
        </div>
      </div>

      <div style={{ marginTop: '16px', fontSize: '11px', color: '#6b7280' }}>
        {showAll
          ? 'Showing all data'
          : `Showing data from ${formatMonthYear(startValue)} to ${formatMonthYear(endValue)}`}
      </div>

      {!showAll && (
        <button
          onClick={handleShowAll}
          style={{
            width: '100%',
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
            marginTop: '12px',
          }}
        >
          Show all time
        </button>
      )}
    </div>
  );
}
