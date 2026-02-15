'use client';

import { useMemo, useRef, useEffect } from 'react';
import { TokenGraph } from './TokenGraph';
import { SwimLanes } from './SwimLanes';
import { Playhead } from './Playhead';
import { GridLines } from './GridLines';
import { TimeAxis } from './TimeAxis';

interface TimelineProps {
  events: any[];
  insights: any[];
  sessionStartTime: string | null;
  isLive: boolean;
  activeFilters: string[];
  onSelectEvent?: (event: any) => void;
}

export function Timeline({ events, insights, sessionStartTime, isLive, activeFilters, onSelectEvent }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLive && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [events, insights, isLive]);
  const startTime = useMemo(() =>
    sessionStartTime ? new Date(sessionStartTime).getTime() : Date.now() - 60000,
    [sessionStartTime]
  );

  const endTime = useMemo(() => {
    if (isLive) return Date.now();
    const allTimestamps = [
      ...events.map(e => new Date(e.timestamp).getTime()),
      ...insights.map(i => new Date(i.timestamp).getTime()),
    ];
    return allTimestamps.length ? Math.max(...allTimestamps) : startTime + 60000;
  }, [events, insights, isLive, startTime]);

  const playheadPosition = useMemo(() => {
    if (!isLive) return 100;
    const duration = endTime - startTime || 1;
    return Math.min(100, ((Date.now() - startTime) / duration) * 100);
  }, [isLive, startTime, endTime]);

  return (
    <div ref={scrollRef} className="mx-6 rounded-xl border border-[#27272a] bg-[#111114] overflow-x-auto animate-fade-in stagger-4">
      {/* Token graph */}
      <TokenGraph events={events} startTime={startTime} endTime={endTime} />

      {/* Swim lanes with playhead and grid */}
      <div className="relative">
        <div className="ml-[100px] relative">
          <GridLines count={8} />
          <Playhead position={playheadPosition} />
        </div>
        <SwimLanes
          events={events}
          insights={insights}
          startTime={startTime}
          endTime={endTime}
          activeFilters={activeFilters}
          onSelectEvent={onSelectEvent}
        />
      </div>

      {/* Time axis */}
      <TimeAxis startTime={startTime} endTime={endTime} />
    </div>
  );
}
