'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSessionInsights } from '@/hooks/useSessionInsights';
import { TopNav } from './TopNav';
import { SessionHeader } from './SessionHeader';
import { StatsBar } from './StatsBar';
import { FilterBar } from './FilterBar';
import { Timeline } from './Timeline/Timeline';
import { InsightFeed } from './InsightFeed';
import { SessionSummary } from './SessionSummary';

interface DashboardPageProps {
  session: any;
}

export function DashboardPage({ session }: DashboardPageProps) {
  const { insights, events, reasoningUpdates, signals, copilotQuestions, phaseChanges, summary } = useSessionInsights(session.id);
  const [activeFilters, setActiveFilters] = useState(['ai', 'files', 'terminal', 'signals', 'reasoning', 'copilot']);

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const stats = useMemo(() => ({
    aiPrompts: events.filter(e => e.event_type === 'claude_code_event').length,
    filesChanged: events.filter(e => e.event_type === 'file_change').length,
    commandsRun: events.filter(e => e.event_type === 'terminal_output').length,
    signals: {
      green: signals.filter(s => s.content?.signal_type === 'green').length,
      yellow: signals.filter(s => s.content?.signal_type === 'yellow').length,
      red: signals.filter(s => s.content?.signal_type === 'red').length,
    },
    reasoningCount: reasoningUpdates.length,
    copilotTips: copilotQuestions.length,
    phaseChanges: phaseChanges.length,
    highPriorityCopilot: copilotQuestions.filter(q => q.content?.priority === 'high').length,
  }), [events, signals, reasoningUpdates, copilotQuestions, phaseChanges]);

  const [elapsed, setElapsed] = useState('0m 00s');

  useEffect(() => {
    if (!session.started_at) return;
    const start = new Date(session.started_at).getTime();

    if (session.status === 'completed' && session.ended_at) {
      const end = new Date(session.ended_at).getTime();
      const s = Math.floor((end - start) / 1000);
      setElapsed(`${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, '0')}s`);
      return;
    }

    const tick = () => {
      const s = Math.floor((Date.now() - start) / 1000);
      setElapsed(`${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, '0')}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session.started_at, session.status, session.ended_at]);

  const handleEndSession = async () => {
    await fetch(`/api/sessions/${session.id}/end`, { method: 'POST' });
  };

  const handleExportReport = () => {
    const report = {
      session: { id: session.id, candidate: candidateName, challenge: challengeTitle, status: session.status },
      stats,
      signals: signals.map(s => s.content),
      reasoning: reasoningUpdates.map(r => r.content),
      copilotQuestions: copilotQuestions.map(q => q.content),
      summary: summary?.content || null,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atrium-report-${session.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLive = session.status === 'active';
  const challengeTitle = session.challenges?.title || 'Interview Session';
  const candidateName = session.candidate_name || 'Unknown';

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#3b82f6]/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        <TopNav />
        <SessionHeader
          title={challengeTitle}
          candidateName={candidateName}
          status={session.status}
          startedAt={session.started_at}
          endedAt={session.ended_at}
          onEndSession={handleEndSession}
          onExportReport={handleExportReport}
        />
        <StatsBar {...stats} />
        <FilterBar
          activeFilters={activeFilters}
          onToggleFilter={toggleFilter}
          duration={elapsed}
        />

        {summary ? (
          <SessionSummary summary={summary} />
        ) : (
          <>
            <Timeline
              events={events}
              insights={insights}
              sessionStartTime={session.started_at}
              isLive={isLive}
              activeFilters={activeFilters}
            />
            <InsightFeed
              insights={insights}
              sessionStartTime={session.started_at}
            />
          </>
        )}
      </div>
    </div>
  );
}
