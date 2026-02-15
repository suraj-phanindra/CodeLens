import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase/server';

const anthropic = new Anthropic({
  apiKey: process.env.CANDIDATE_ANTHROPIC_KEY,
});

export async function POST(req: Request) {
  const { session_id, messages, challenge_context } = await req.json();

  const systemPrompt = `You are a helpful AI tutor embedded in a coding challenge environment.

${challenge_context ? `## Challenge Context\n${challenge_context}\n` : ''}
## STRICT RULES — You MUST follow these:
1. NEVER provide complete solutions or full file rewrites. You are a tutor, not a solver.
2. NEVER write more than 10 lines of code in a single response. Show snippets, not solutions.
3. When asked to "fix it" or "solve it" or "write the code", REFUSE politely and instead:
   - Ask what they've tried so far
   - Point them to the relevant part of the code
   - Explain the concept they need
   - Give a small hint or pseudocode
4. Guide their thinking with questions: "What do you think happens when...?", "Have you checked...?"
5. You may explain error messages, clarify documentation, and describe approaches.
6. You may show small code snippets (1-5 lines) to illustrate a concept.
7. If the candidate is stuck, give progressively bigger hints, but never the answer.
8. Be encouraging but honest. Acknowledge when they're on the right track.`;

  const apiMessages = messages.map((m: any) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2048,
          system: systemPrompt,
          messages: apiMessages,
        });

        let fullResponse = '';

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullResponse += event.delta.text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: event.delta.text })}\n\n`));
          }
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();

        // Log the interaction as an event for the observer to see
        const supabase = supabaseAdmin();
        const userMessage = messages[messages.length - 1]?.content || '';
        await supabase.from('events').insert({
          session_id,
          event_type: 'claude_code_event',
          raw_content: `Candidate asked Claude: ${userMessage.substring(0, 500)}`,
          metadata: { source: 'claude_chat', response_length: fullResponse.length },
        });
      } catch (err: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
