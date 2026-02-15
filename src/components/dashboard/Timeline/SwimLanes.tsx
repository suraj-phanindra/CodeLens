'use client';

import { useMemo } from 'react';
import { SwimLane } from './SwimLane';
import { EventMarker } from './EventMarker';

interface SwimLanesProps {
  events: any[];
  insights: any[];
  startTime: number;
  endTime: number;
  activeFilters: string[];
  onSelectEvent?: (event: any) => void;
}

export function SwimLanes({ events, insights, startTime, endTime, activeFilters, onSelectEvent }: SwimLanesProps) {
  const duration = endTime - startTime || 1;

  const getPosition = (timestamp: string) => {
    const t = new Date(timestamp).getTime();
    return Math.max(0, Math.min(100, ((t - startTime) / duration) * 100));
  };

  const aiEvents = useMemo(() =>
    events.filter(e => e.event_type === 'claude_code_event'),
    [events]
  );

  const fileEvents = useMemo(() =>
    events.filter(e => e.event_type === 'file_change'),
    [events]
  );

  const terminalEvents = useMemo(() =>
    events.filter(e => e.event_type === 'terminal_output' || e.event_type === 'command_executed'),
    [events]
  );

  const signalInsights = useMemo(() =>
    insights.filter(i => i.insight_type === 'signal'),
    [insights]
  );

  const reasoningInsights = useMemo(() =>
    insights.filter(i => i.insight_type === 'reasoning_update'),
    [insights]
  );

  const copilotInsights = useMemo(() =>
    insights.filter(i => i.insight_type === 'copilot_question'),
    [insights]
  );

  return (
    <div className="border-t border-[#1e1e22]">
      {activeFilters.includes('ai') && (
        <SwimLane label="AI Prompts" color="#3b82f6">
          {aiEvents.map((e, i) => (
            <EventMarker
              key={i}
              type="ai"
              color="#3b82f6"
              style={{ left: `${getPosition(e.timestamp)}%` }}
              onClick={() => onSelectEvent?.(e)}
            />
          ))}
        </SwimLane>
      )}

      {activeFilters.includes('files') && (
        <SwimLane label="File Changes" color="#a78bfa">
          {fileEvents.map((e, i) => (
            <EventMarker
              key={i}
              type="file"
              color="#a78bfa"
              style={{ left: `${getPosition(e.timestamp)}%` }}
              onClick={() => onSelectEvent?.(e)}
            />
          ))}
        </SwimLane>
      )}

      {activeFilters.includes('terminal') && (
        <SwimLane label="Terminal" color="#fb923c">
          {terminalEvents.map((e, i) => (
            <EventMarker
              key={i}
              type="terminal"
              color="#fb923c"
              width={Math.max(8, Math.min(40, (e.raw_content?.length || 0) / 10))}
              style={{ left: `${getPosition(e.timestamp)}%` }}
              onClick={() => onSelectEvent?.(e)}
            />
          ))}
        </SwimLane>
      )}

      {activeFilters.includes('signals') && (
        <SwimLane label="Signals" color="#34d399">
          {signalInsights.map((i, idx) => (
            <EventMarker
              key={idx}
              type="signal"
              color="#34d399"
              signalType={i.content?.signal_type}
              style={{ left: `${getPosition(i.timestamp)}%` }}
              onClick={() => onSelectEvent?.(i)}
            />
          ))}
        </SwimLane>
      )}

      {activeFilters.includes('reasoning') && (
        <SwimLane label="Reasoning" color="#22d3ee">
          {reasoningInsights.map((insight, i) => (
            <EventMarker
              key={insight.id || i}
              type="signal"
              color="#22d3ee"
              style={{ left: `${getPosition(insight.timestamp)}%` }}
              onClick={() => onSelectEvent?.(insight)}
            />
          ))}
        </SwimLane>
      )}

      {activeFilters.includes('copilot') && (
        <SwimLane label="Copilot" color="#f472b6">
          {copilotInsights.map((i, idx) => (
            <EventMarker
              key={idx}
              type="copilot"
              color="#f472b6"
              style={{ left: `${getPosition(i.timestamp)}%` }}
              onClick={() => onSelectEvent?.(i)}
            />
          ))}
        </SwimLane>
      )}
    </div>
  );
}
