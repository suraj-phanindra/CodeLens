import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase/server';

const anthropic = new Anthropic();

export async function generateCopilotQuestions(
  sessionId: string,
  rubricCriteria: any[],
  recentInsights: any[]
): Promise<any[]> {
  const supabase = supabaseAdmin();

  const recentSignals = recentInsights
    .filter(i => i.insight_type === 'signal')
    .slice(-5);

  const recentReasoning = recentInsights
    .filter(i => i.insight_type === 'reasoning_update')
    .slice(-2);

  if (recentSignals.length === 0 && recentReasoning.length === 0) {
    return [];
  }

  const prompt = `Based on the following session analysis, suggest 1-2 follow-up questions the interviewer should ask.

Rubric criteria (weighted):
${rubricCriteria.map(c => `- ${c.name} (${c.weight}%): ${c.description}`).join('\n')}

Recent signals:
${recentSignals.map(s => `[${s.content.signal_type}] ${s.content.title}: ${s.content.description}`).join('\n')}

Current reasoning:
${recentReasoning.map(r => `Phase: ${r.content.phase}: ${r.content.summary}`).join('\n')}

For each question, produce JSON:
[{
  "question": "the question to ask",
  "context": "why this matters now",
  "priority": "high|medium|low",
  "rubric_criterion": "name from rubric",
  "rubric_weight": number
}]

Focus on the highest-weighted rubric criteria that haven't been adequately tested yet.
Return ONLY a JSON array.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const text = textBlock ? textBlock.text : '[]';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const questions = JSON.parse(cleaned);

    // Insert as insights
    if (questions.length) {
      await supabase.from('insights').insert(
        questions.map((q: any) => ({
          session_id: sessionId,
          insight_type: 'copilot_question',
          content: q,
          rubric_criterion: q.rubric_criterion || null,
        }))
      );
    }

    return questions;
  } catch (error) {
    console.error('Copilot generation error:', error);
    return [];
  }
}
