"use client";

import { useMemo } from "react";
import { format } from "date-fns";

interface TimelineSliderProps {
  startDate: Date;
  endDate: Date;
  currentStart: Date;
  currentEnd: Date;
  onRangeChange: (start: Date, end: Date) => void;
}

export default function TimelineSlider({
  startDate,
  endDate,
  currentStart,
  currentEnd,
  onRangeChange,
}: TimelineSliderProps) {
  const totalDays = useMemo(() => {
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [startDate, endDate]);

  const startOffset = useMemo(() => {
    return Math.ceil((currentStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [currentStart, startDate]);

  const endOffset = useMemo(() => {
    return Math.ceil((currentEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [currentEnd, startDate]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = parseInt(e.target.value);
    const newStart = new Date(startDate);
    newStart.setDate(startDate.getDate() + days);
    if (newStart < currentEnd) {
      onRangeChange(newStart, currentEnd);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = parseInt(e.target.value);
    const newEnd = new Date(startDate);
    newEnd.setDate(startDate.getDate() + days);
    if (newEnd > currentStart) {
      onRangeChange(currentStart, newEnd);
    }
  };

  return (
    <div className="bg-detective-board border border-gray-700 rounded-lg p-4">
      <div className="mb-2 flex justify-between items-center">
        <div className="text-sm text-detective-text">
          <span className="font-semibold">Timeline Filter</span>
        </div>
        <div className="text-xs text-detective-muted">
          {format(currentStart, "MMM d, yyyy")} - {format(currentEnd, "MMM d, yyyy")}
        </div>
      </div>
      
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-detective-muted mb-1">
              Start: {format(currentStart, "MMM d, yyyy")}
            </label>
            <input
              type="range"
              min="0"
              max={totalDays}
              value={startOffset}
              onChange={handleStartChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-detective-accent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-detective-muted mb-1">
              End: {format(currentEnd, "MMM d, yyyy")}
            </label>
            <input
              type="range"
              min="0"
              max={totalDays}
              value={endOffset}
              onChange={handleEndChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-detective-accent"
            />
          </div>
        </div>
        
        <div className="mt-2 flex justify-between text-xs text-detective-muted">
          <span>{format(startDate, "MMM d, yyyy")}</span>
          <span>{format(endDate, "MMM d, yyyy")}</span>
        </div>
      </div>
    </div>
  );
}
