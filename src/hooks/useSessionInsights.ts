'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useSessionInsights(sessionId: string) {
  const [insights, setInsights] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();

    // Load existing data
    supabase.from('insights').select('*').eq('session_id', sessionId)
      .order('timestamp', { ascending: true })
      .then(({ data }) => { if (data) setInsights(data); });

    supabase.from('events').select('*').eq('session_id', sessionId)
      .order('timestamp', { ascending: false }).limit(100)
      .then(({ data }) => { if (data) setEvents(data.reverse()); });

    // Subscribe to new insights
    const insightsChannel = supabase.channel(`insights:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'insights',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => setInsights(prev =>
        prev.some(i => i.id === payload.new.id) ? prev : [...prev, payload.new]
      ))
      .subscribe();

    // Subscribe to new events
    const eventsChannel = supabase.channel(`events:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => setEvents(prev =>
        prev.some(e => e.id === payload.new.id) ? prev : [...prev.slice(-199), payload.new]
      ))
      .subscribe();

    return () => {
      insightsChannel.unsubscribe();
      eventsChannel.unsubscribe();
    };
  }, [sessionId]);

  return {
    insights,
    events,
    reasoningUpdates: insights.filter(i => i.insight_type === 'reasoning_update'),
    signals: insights.filter(i => i.insight_type === 'signal'),
    copilotQuestions: insights.filter(i => i.insight_type === 'copilot_question'),
    phaseChanges: insights.filter(i => i.insight_type === 'phase_change'),
    summary: insights.find(i => i.insight_type === 'summary'),
  };
}
