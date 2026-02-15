'use client';

import { useEffect, useState } from 'react';
import { PulseDot } from './LiveIndicators';

interface SessionHeaderProps {
  title: string;
  candidateName: string;
  status: string;
  startedAt: string | null;
  onEndSession?: () => void;
  onExportReport?: () => void;
}

export function SessionHeader({ title, candidateName, status, startedAt, onEndSession, onExportReport }: SessionHeaderProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt || status === 'completed') return;
    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, status]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="px-6 py-4 border-b border-[#1e1e22] animate-fade-in stagger-1">
      <div className="font-mono text-[12.5px] text-[#71717a] mb-1">
        Interview &rsaquo; {title}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold text-[#fafafa] tracking-[-0.5px]">{title}</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-[#a1a1aa]">
            <span className="flex items-center gap-2">
              <PulseDot color={status === 'active' ? '#34d399' : '#71717a'} />
              {status === 'active' ? 'Live' : status === 'completed' ? 'Completed' : 'Pending'}
            </span>
            {candidateName && <span>Candidate: @{candidateName}</span>}
            <span className="font-mono">{formatDuration(elapsed)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onExportReport} className="px-4 py-2 text-sm rounded-lg bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] transition-colors">
            Export Report
          </button>
          <button
            onClick={onEndSession}
            className="px-4 py-2 text-sm rounded-lg bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90 transition-colors"
          >
            {status === 'completed' ? 'View Summary' : 'End Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
