import Anthropic from '@anthropic-ai/sdk';
import { ARCHITECT_SYSTEM_PROMPT } from '@/lib/agents/prompts';
import { ARCHITECT_TOOLS } from '@/lib/agents/tools';
import { handleToolCall } from '@/lib/agents/architect';

const anthropic = new Anthropic();

export const maxDuration = 120;

export async function POST(req: Request) {
  const { messages, setupId, uploadedFiles } = await req.json();

  const encoder = new TextEncoder();
  const context = { setupId: setupId || 'default', challengeId: undefined, rubricId: undefined };

  // Build dynamic system prompt with file context
  let systemPrompt = ARCHITECT_SYSTEM_PROMPT;
  if (uploadedFiles?.length > 0) {
    const fileDescriptions = uploadedFiles.map((f: any) => {
      const typeLabel = f.type === 'job_description' ? 'Job Description'
        : f.type === 'resume' ? 'Resume'
        : 'Document';
      return `- ${typeLabel}: "${f.name}" (file_id: ${f.id})`;
    }).join('\n');
    systemPrompt += `\n\n## Currently Uploaded Files\n\nThe interviewer has already uploaded:\n${fileDescriptions}\n\nIMPORTANT: Call parse_uploaded_document for each file immediately. Do not ask for files already listed here.`;
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Convert messages to Anthropic format
        const anthropicMessages = messages.map((m: any) => ({
          role: m.role === 'tool_result' ? 'user' : m.role === 'tool_use' ? 'assistant' : m.role,
          content: m.role === 'tool_result'
            ? [{ type: 'tool_result' as const, tool_use_id: m.metadata?.tool_use_id, content: m.content }]
            : m.role === 'tool_use'
              ? [{ type: 'tool_use' as const, id: m.metadata?.tool_use_id, name: m.metadata?.tool_name, input: JSON.parse(m.content) }]
              : m.content,
        }));

        let currentMessages = anthropicMessages;
        let continueLoop = true;

        while (continueLoop) {
          continueLoop = false;

          // Use streaming API for real-time token delivery
          const response = anthropic.messages.stream({
            model: 'claude-opus-4-6',
            max_tokens: 4096,
            system: systemPrompt,
            messages: currentMessages,
            tools: ARCHITECT_TOOLS,
          });

          // Stream text deltas in real-time
          response.on('text', (text) => {
            send({ type: 'text', content: text });
          });

          // Wait for the full message to complete
          const finalMessage = await response.finalMessage();

          const toolUseBlocks = finalMessage.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          );

          if (toolUseBlocks.length > 0) {
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of toolUseBlocks) {
              send({ type: 'tool_use', tool: block.name, input: block.input, tool_use_id: block.id });
              const result = await handleToolCall(block.name, block.input as Record<string, any>, context);
              send({ type: 'tool_result', tool: block.name, result, tool_use_id: block.id });
              toolResults.push({
                type: 'tool_result' as const,
                tool_use_id: block.id,
                content: result,
              });
            }

            currentMessages = [
              ...currentMessages,
              { role: 'assistant' as const, content: finalMessage.content },
              { role: 'user' as const, content: toolResults },
            ];
            continueLoop = true;
          }

          if (finalMessage.stop_reason === 'end_turn') {
            continueLoop = false;
          }
        }

        send({ type: 'done' });
      } catch (error: any) {
        console.error('[chat route] Error:', error?.error || error?.message || error);
        const msg = error?.error?.error?.message || error?.message || 'An error occurred';
        send({ type: 'error', message: msg });
      } finally {
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
