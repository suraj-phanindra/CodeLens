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
    codeRuns: events.filter(e => e.event_type === 'code_run').length,
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

  const handleExportReport = async () => {
    const { exportSessionPdf } = await import('@/lib/exportPdf');
    exportSessionPdf({
      challengeTitle,
      candidateName,
      duration: elapsed,
      sessionDate: session.started_at
        ? new Date(session.started_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      summary: summary?.content || {
        overall_score: 0,
        hiring_signal: 'pending',
        one_line_summary: 'Session still in progress',
        rubric_scores: [],
        strengths: [],
        concerns: [],
        recommended_follow_ups: [],
      },
      signalCounts: stats.signals,
    });
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
              events={events}
              sessionStartTime={session.started_at}
            />
          </>
        )}
      </div>
    </div>
  );
}
