'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Send, Loader2 } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ToolResultCard } from './ToolResultCard';
import { FileUpload } from './FileUpload';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool_use' | 'tool_result';
  content: string;
  metadata?: Record<string, any>;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [setupId] = useState(() => crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleFileUploaded = useCallback((file: any) => {
    setUploadedFiles(prev => [...prev, file]);
  }, []);

  const handleFileRemoved = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const sendMessage = useCallback(async (overrideMessage?: string) => {
    const trimmed = (overrideMessage ?? input).trim();
    if ((!trimmed && uploadedFiles.length === 0) || isStreaming) return;

    // If no text but files exist, generate a synthetic message
    const messageText = trimmed || `I've uploaded: ${uploadedFiles.map(f => f.name).join(', ')}. Please process them.`;

    setShowSuggestions(false);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!overrideMessage) setInput('');
    setIsStreaming(true);

    // Prepare messages for API (only user + assistant + tool messages)
    const apiMessages = newMessages.map(m => ({
      role: m.role,
      content: m.content,
      metadata: m.metadata,
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          setupId,
          uploadedFiles: uploadedFiles.map(f => ({ id: f.id, name: f.name, type: f.type })),
        }),
      });

      if (!response.ok) throw new Error('Failed to connect');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantId = crypto.randomUUID();
      let buffer = '';

      // Add placeholder assistant message
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            switch (event.type) {
              case 'text':
                assistantContent += event.content;
                setMessages(prev => {
                  const exists = prev.some(m => m.id === assistantId);
                  if (exists) {
                    return prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m);
                  }
                  return [...prev, { id: assistantId, role: 'assistant', content: assistantContent }];
                });
                break;

              case 'tool_use':
                setMessages(prev => [...prev, {
                  id: `tu-${event.tool_use_id}`,
                  role: 'tool_use',
                  content: JSON.stringify(event.input),
                  metadata: { tool_name: event.tool, tool_use_id: event.tool_use_id },
                }]);
                break;

              case 'tool_result':
                setMessages(prev => [...prev, {
                  id: `tr-${event.tool_use_id}`,
                  role: 'tool_result',
                  content: event.result,
                  metadata: { tool_name: event.tool, tool_use_id: event.tool_use_id },
                }]);
                // Reset for next assistant response (placeholder created on first text event)
                assistantContent = '';
                assistantId = crypto.randomUUID();
                break;

              case 'error':
                setMessages(prev => [...prev, {
                  id: `err-${crypto.randomUUID()}`,
                  role: 'assistant',
                  content: `Error: ${event.message}`,
                }]);
                break;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Clean up empty assistant messages
      setMessages(prev => prev.filter(m => !(m.role === 'assistant' && !m.content.trim())));
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Connection error: ${error.message}. Please try again.`,
      }]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, isStreaming, setupId, uploadedFiles]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && showSuggestions && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Image src="/atrium-icon.png" alt="Atrium" width={48} height={48} className="rounded-xl mb-4" />
            <h2 className="text-xl font-semibold text-[#fafafa] mb-2">Interview Architect</h2>
            <p className="text-[#71717a] text-sm max-w-md">
              Welcome to Atrium. I&apos;ll help you set up a custom technical interview. To get started, tell me about the role you&apos;re hiring for, or upload a job description and I&apos;ll take it from there.
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              {[
                'Set up a technical interview',
                'I have a JD and resume ready',
                'Quick interview setup',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="px-4 py-2 text-sm rounded-full border border-[#27272a] bg-[#111114] text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa] hover:border-[#3b82f6]/50 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto">
          {messages.map((msg, index) => {
            if (msg.role === 'tool_result') {
              return (
                <ToolResultCard
                  key={`${msg.id}-${index}`}
                  toolName={msg.metadata?.tool_name || ''}
                  result={msg.content}
                />
              );
            }
            if (msg.role === 'tool_use') {
              return null;
            }
            if (msg.role === 'assistant' && !msg.content) {
              return null;
            }
            return (
              <MessageBubble
                key={`${msg.id}-${index}`}
                role={msg.role as 'user' | 'assistant'}
                content={msg.content}
                isStreaming={isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant'}
              />
            );
          })}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-[#1e1e22] px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {/* Uploaded file chips */}
          {uploadedFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {uploadedFiles.map(f => (
                <span key={f.id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[#18181b] border border-[#27272a] text-[#a1a1aa]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                  {f.type === 'job_description' ? 'JD' : f.type === 'resume' ? 'Resume' : 'Doc'}: {f.name}
                  <button onClick={() => handleFileRemoved(f.id)} className="ml-1 text-[#71717a] hover:text-[#fafafa]">&times;</button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Inline file upload */}
            <FileUpload onFileUploaded={handleFileUploaded} onUploadingChange={setIsFileUploading} />

            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the role, or upload files to get started..."
                rows={1}
                className="w-full resize-none rounded-xl bg-[#111114] border border-[#27272a] px-4 py-3 text-sm text-[#fafafa] placeholder:text-[#71717a] focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
                disabled={isStreaming}
              />
            </div>

            <button
              onClick={() => sendMessage()}
              disabled={(!input.trim() && uploadedFiles.length === 0) || isStreaming || isFileUploading}
              className={cn(
                'p-2 rounded-lg transition-all',
                (input.trim() || uploadedFiles.length > 0) && !isStreaming && !isFileUploading
                  ? 'bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90'
                  : 'bg-[#18181b] text-[#71717a] cursor-not-allowed'
              )}
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
