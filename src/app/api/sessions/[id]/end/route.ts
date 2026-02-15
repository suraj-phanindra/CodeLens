import { NextRequest } from 'next/server';
import { Sandbox } from 'e2b';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase/server';
import { stopObserverLoop } from '@/lib/agents/observer';
import { SUMMARY_SYSTEM, SUMMARY_USER } from '@/lib/agents/prompts';
import { activeSandboxes } from '@/app/api/sandbox/create/route';

const anthropic = new Anthropic();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = supabaseAdmin();

    // Stop observer
    stopObserverLoop(sessionId);

    // Stop sandbox capture and kill the sandbox VM
    const sandboxInfo = activeSandboxes.get(sessionId);
    if (sandboxInfo) {
      sandboxInfo.capture.stop();
      try {
        await sandboxInfo.sandbox.kill();
      } catch (e) {
        console.error('Failed to kill sandbox:', e);
      }
      activeSandboxes.delete(sessionId);
    } else {
      // DB fallback: Map is in-memory and lost on hot reload
      const { data: sess } = await supabase
        .from('sessions')
        .select('sandbox_id')
        .eq('id', sessionId)
        .single();
      if (sess?.sandbox_id) {
        try {
          const sb = await Sandbox.connect(sess.sandbox_id);
          await sb.kill();
        } catch (e) {
          console.error('Failed to kill sandbox via DB fallback:', e);
        }
      }
    }

    // Get session data
    const { data: session } = await supabase
      .from('sessions')
      .select('*, challenges(*), rubrics(*)')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get all events and insights
    const [{ data: allEvents }, { data: allInsights }] = await Promise.all([
      supabase.from('events').select('*').eq('session_id', sessionId).order('timestamp', { ascending: true }),
      supabase.from('insights').select('*').eq('session_id', sessionId).order('timestamp', { ascending: true }),
    ]);

    const challenge = (session as any).challenges;
    const rubric = (session as any).rubrics;
    const durationSeconds = session.started_at
      ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
      : 0;

    // Generate summary with Opus 4.6
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 3000,
      system: SUMMARY_SYSTEM,
      messages: [{
        role: 'user',
        content: SUMMARY_USER(
          challenge?.description || '',
          challenge?.expected_bugs || [],
          rubric?.criteria || [],
          allEvents || [],
          allInsights || [],
          durationSeconds
        ),
      }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const summaryText = textBlock ? textBlock.text : '{}';
    const cleaned = summaryText.replace(/```json\n?|\n?```/g, '').trim();
    let summaryContent;
    try {
      summaryContent = JSON.parse(cleaned);
    } catch {
      summaryContent = { overall_score: 0, one_line_summary: 'Failed to generate summary' };
    }

    // Insert summary insight
    await supabase.from('insights').insert({
      session_id: sessionId,
      insight_type: 'summary',
      content: summaryContent,
    });

    // Insert session_end event
    await supabase.from('events').insert({
      session_id: sessionId,
      event_type: 'session_end',
      raw_content: 'Interview session ended',
    });

    // Update session status
    await supabase.from('sessions').update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    }).eq('id', sessionId);

    return Response.json({ summary: summaryContent, status: 'completed' });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
