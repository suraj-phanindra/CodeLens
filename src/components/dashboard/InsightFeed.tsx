'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface InsightFeedProps {
  insights: any[];
  sessionStartTime: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; borderColor: string }> = {
  reasoning_update: { label: 'REASONING', color: '#22d3ee', borderColor: '#22d3ee' },
  signal: { label: 'SIGNAL', color: '#71717a', borderColor: '#71717a' },
  copilot_question: { label: 'COPILOT TIP', color: '#f472b6', borderColor: '#f472b6' },
  phase_change: { label: 'PHASE CHANGE', color: '#a78bfa', borderColor: '#a78bfa' },
};

const SIGNAL_COLORS: Record<string, string> = {
  green: '#34d399',
  yellow: '#fb923c',
  red: '#f87171',
};

const SIGNAL_EMOJI: Record<string, string> = {
  green: '\u{1F7E2}',
  yellow: '\u{1F7E1}',
  red: '\u{1F534}',
};

type FilterType = 'reasoning_update' | 'signal' | 'copilot_question' | 'phase_change';

const FILTER_OPTIONS: { key: FilterType; label: string; color: string }[] = [
  { key: 'reasoning_update', label: 'Reasoning', color: '#22d3ee' },
  { key: 'signal', label: 'Signals', color: '#fb923c' },
  { key: 'copilot_question', label: 'Copilot', color: '#f472b6' },
  { key: 'phase_change', label: 'Phases', color: '#a78bfa' },
];

function formatRelativeTime(timestamp: string, sessionStart: string) {
  const t = new Date(timestamp).getTime();
  const s = new Date(sessionStart).getTime();
  const diff = Math.max(0, Math.floor((t - s) / 1000));
  const m = Math.floor(diff / 60);
  const sec = diff % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function InsightFeed({ insights, sessionStartTime }: InsightFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(
    new Set(['reasoning_update', 'signal', 'copilot_question', 'phase_change'])
  );

  const toggleFilter = (key: FilterType) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Auto-scroll to bottom when new insights arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [insights.length, autoScroll]);

  // Detect user scrolling up to pause auto-scroll
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 60;
    setAutoScroll(atBottom);
  }, []);

  const filtered = insights
    .filter(i => activeFilters.has(i.insight_type))
    .sort((a, b) => new Date(a.timestamp || a.created_at).getTime() - new Date(b.timestamp || b.created_at).getTime());

  return (
    <div className="mx-6 mb-4 rounded-xl border border-[#27272a] bg-[#111114] flex flex-col relative" style={{ height: '420px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e22] flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[#fafafa]">Live Insights</h3>
          <span className="flex items-center gap-1.5 text-[10px] text-[#34d399]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
            Live
          </span>
        </div>
        {/* Filter chips */}
        <div className="flex items-center gap-1.5">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              className="px-2 py-0.5 rounded text-[10px] font-medium transition-all border"
              style={{
                backgroundColor: activeFilters.has(f.key) ? `${f.color}15` : 'transparent',
                borderColor: activeFilters.has(f.key) ? `${f.color}40` : '#27272a',
                color: activeFilters.has(f.key) ? f.color : '#71717a',
                opacity: activeFilters.has(f.key) ? 1 : 0.6,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-full text-[#71717a] text-sm italic">
            Waiting for insights...
          </div>
        )}
        {filtered.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            sessionStartTime={sessionStartTime}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Scroll indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            setAutoScroll(true);
          }}
          className="absolute bottom-14 right-10 px-3 py-1.5 rounded-lg bg-[#3b82f6] text-white text-xs shadow-lg hover:bg-[#3b82f6]/90 transition-colors"
        >
          New insights
        </button>
      )}
    </div>
  );
}

function InsightCard({ insight, sessionStartTime }: { insight: any; sessionStartTime: string }) {
  const content = insight.content;
  const type = insight.insight_type;
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.reasoning_update;
  const time = formatRelativeTime(insight.timestamp || insight.created_at, sessionStartTime);

  // For signals, override color based on signal_type
  const isSignal = type === 'signal';
  const signalColor = isSignal ? SIGNAL_COLORS[content?.signal_type] || config.color : config.color;
  const borderColor = isSignal ? signalColor : config.borderColor;

  return (
    <div
      className="rounded-lg bg-[#09090b] border p-3 animate-fade-in"
      style={{ borderColor: `${borderColor}30` }}
    >
      {/* Header line */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono text-[#71717a]">{time}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isSignal ? signalColor : config.color }}>
          {isSignal ? `${SIGNAL_EMOJI[content?.signal_type] || ''} ${content?.signal_type?.toUpperCase()} SIGNAL` : config.label}
        </span>
      </div>

      {/* Content */}
      {type === 'reasoning_update' && (
        <div>
          <p className="text-sm text-[#fafafa] leading-relaxed">{content?.summary}</p>
          {content?.current_hypothesis && (
            <p className="text-xs text-[#a1a1aa] mt-1 font-mono">{content.current_hypothesis}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/20">
              {content?.phase}
            </span>
            {content?.rubric_relevance?.criterion && (
              <span className="text-[10px] text-[#71717a]">{content.rubric_relevance.criterion}</span>
            )}
          </div>
        </div>
      )}

      {type === 'signal' && (
        <div>
          <p className="text-sm font-medium text-[#fafafa]">{content?.title}</p>
          {content?.evidence && (
            <p className="text-xs text-[#a1a1aa] mt-1 font-mono leading-relaxed">{content.evidence}</p>
          )}
          <div className="mt-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18181b] text-[#a1a1aa] border border-[#27272a]">
              {content?.rubric_criterion} ({content?.rubric_weight}%)
            </span>
          </div>
        </div>
      )}

      {type === 'copilot_question' && (
        <div>
          <p className="text-sm text-[#fafafa] leading-relaxed">&ldquo;{content?.question}&rdquo;</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18181b] text-[#a1a1aa] border border-[#27272a]">
              {content?.rubric_criterion} ({content?.rubric_weight}%)
            </span>
            <span className="text-[10px] text-[#f472b6]">{content?.priority} priority</span>
          </div>
        </div>
      )}

      {type === 'phase_change' && (
        <div>
          <p className="text-sm text-[#fafafa]">
            <span className="text-[#a78bfa]">{content?.from_phase}</span>
            <span className="text-[#71717a] mx-2">&rarr;</span>
            <span className="text-[#a78bfa]">{content?.to_phase}</span>
          </p>
          <p className="text-xs text-[#71717a] mt-1">{content?.trigger}</p>
        </div>
      )}
    </div>
  );
}
