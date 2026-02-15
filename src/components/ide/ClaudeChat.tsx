'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M16.604 8.516c-.253-.773-1.044-.773-1.297 0l-1.074 3.29-3.29 1.074c-.773.253-.773 1.044 0 1.297l3.29 1.074 1.074 3.29c.253.773 1.044.773 1.297 0l1.074-3.29 3.29-1.074c.773-.253.773-1.044 0-1.297l-3.29-1.074-1.074-3.29Z" fill="#E87A41"/>
      <path d="M9.396 4.484c.253.773-.158 1.158-.931.855L5.175 4.265l-1.074 3.29c-.253.773-.773.931-1.158.352L.697 4.617c-.385-.579-.158-1.158.507-1.297l3.29-.579L5.573.45c.253-.773.773-.773 1.158-.158l2.246 3.29.42.902Z" fill="#E87A41" opacity="0.6"/>
    </svg>
  );
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeChatProps {
  sessionId: string;
  challengeDescription?: string;
}

export default function ClaudeChat({ sessionId, challengeDescription }: ClaudeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    // Add placeholder assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/claude-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          messages: newMessages,
          challenge_context: challengeDescription,
        }),
      });

      if (!res.ok) throw new Error('Failed to connect');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'text') {
              assistantContent += parsed.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch {
            // skip malformed
          }
        }
      }

      // Remove empty assistant message if nothing came through
      setMessages(prev => prev.filter(m => !(m.role === 'assistant' && !m.content)));
    } catch (err: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${err.message}` };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, isStreaming, sessionId, challengeDescription]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e1e22] flex-shrink-0">
        <ClaudeIcon className="w-4 h-4" />
        <span className="text-sm font-medium text-[#fafafa]">Claude</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E87A41]/10 text-[#E87A41] border border-[#E87A41]/20 shadow-[0_0_8px_rgba(232,122,65,0.3)] font-mono">
          sonnet 4.5
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <ClaudeIcon className="w-8 h-8 opacity-40" />
            <p className="text-sm text-[#71717a]">
              Ask Claude for help with debugging, understanding the codebase, or writing code.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
            <div
              className={
                msg.role === 'user'
                  ? 'max-w-[85%] rounded-lg bg-[#3b82f6] text-white px-3 py-2 text-sm'
                  : 'text-sm text-[#e4e4e7] leading-relaxed'
              }
            >
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline
                        ? <code className="bg-[#27272a] text-[#e4e4e7] px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                        : <pre className="bg-[#18181b] border border-[#27272a] rounded-lg p-3 overflow-x-auto my-2"><code className="text-xs font-mono text-[#e4e4e7]">{children}</code></pre>;
                    },
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-sm">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-[#fafafa]">{children}</strong>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : msg.content}
              {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && (
                <span className="inline-block w-1.5 h-4 bg-[#E87A41] ml-0.5 animate-pulse" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-[#1e1e22] p-2 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Claude..."
            rows={1}
            className="flex-1 bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-[#fafafa] placeholder-[#71717a] resize-none focus:outline-none focus:border-[#3b82f6]/50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-lg bg-[#3b82f6] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#3b82f6]/90 transition-colors flex-shrink-0"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
