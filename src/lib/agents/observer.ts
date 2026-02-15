import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase/server';
import { OBSERVER_SYSTEM_PROMPT, OBSERVER_USER_MESSAGE } from './prompts';

const anthropic = new Anthropic();

interface ObserverContext {
  sessionId: string;
  challengeDescription: string;
  expectedBugs: any[];
  solutionHints: string;
  rubricCriteria: any[];
  lastProcessedEventId: number;
  previousInsights: any[];
  sessionStartTime: Date;
}

export async function runObserverCycle(ctx: ObserverContext) {
  const supabase = supabaseAdmin();

  // 1. Fetch new events since last processed
  const { data: newEvents } = await supabase
    .from('events')
    .select('*')
    .eq('session_id', ctx.sessionId)
    .gt('id', ctx.lastProcessedEventId)
    .order('id', { ascending: true })
    .limit(50);

  if (!newEvents?.length) {
    return { insights: [], lastProcessedEventId: ctx.lastProcessedEventId };
  }

  // 2. Call Opus 4.6 for analysis
  const elapsed = Math.floor((Date.now() - ctx.sessionStartTime.getTime()) / 1000);

  let responseText = '';
  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    system: OBSERVER_SYSTEM_PROMPT(
      ctx.challengeDescription,
      ctx.expectedBugs,
      ctx.solutionHints,
      ctx.rubricCriteria
    ),
    messages: [{ role: 'user', content: OBSERVER_USER_MESSAGE(newEvents, ctx.previousInsights, elapsed) }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      responseText += event.delta.text;
    }
  }

  // 3. Parse and insert insights
  let insights: any[] = [];
  try {
    const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
    insights = JSON.parse(cleaned);
  } catch {
    return { insights: [], lastProcessedEventId: newEvents[newEvents.length - 1].id };
  }

  if (insights.length) {
    await supabase.from('insights').insert(
      insights.map((i: any) => ({
        session_id: ctx.sessionId,
        insight_type: i.insight_type,
        content: i.content,
        rubric_criterion: i.content?.rubric_criterion || null,
      }))
    );
  }

  return { insights, lastProcessedEventId: newEvents[newEvents.length - 1].id };
}

// Active observer loops stored by sessionId
const activeLoops = new Map<string, ReturnType<typeof setInterval>>();

export async function startObserverLoop(sessionId: string) {
  const supabase = supabaseAdmin();

  const { data: session } = await supabase
    .from('sessions')
    .select('*, challenges(*), rubrics(*)')
    .eq('id', sessionId)
    .single();

  if (!session?.challenges || !session?.rubrics) {
    throw new Error('Missing challenge or rubric for session');
  }

  const ctx: ObserverContext = {
    sessionId,
    challengeDescription: (session as any).challenges.description,
    expectedBugs: (session as any).challenges.expected_bugs || [],
    solutionHints: (session as any).challenges.solution_hints || '',
    rubricCriteria: (session as any).rubrics.criteria || [],
    lastProcessedEventId: 0,
    previousInsights: [],
    sessionStartTime: new Date(session.started_at || session.created_at),
  };

  const interval = setInterval(async () => {
    try {
      const result = await runObserverCycle(ctx);
      ctx.lastProcessedEventId = result.lastProcessedEventId;
      ctx.previousInsights.push(...result.insights);
      // Keep only last 10 insights for context window
      if (ctx.previousInsights.length > 10) {
        ctx.previousInsights = ctx.previousInsights.slice(-10);
      }
    } catch (e) {
      console.error('Observer cycle error:', e);
    }
  }, 10000);

  activeLoops.set(sessionId, interval);

  return () => {
    clearInterval(interval);
    activeLoops.delete(sessionId);
  };
}

export function stopObserverLoop(sessionId: string) {
  const interval = activeLoops.get(sessionId);
  if (interval) {
    clearInterval(interval);
    activeLoops.delete(sessionId);
  }
}
