'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex w-full mb-4', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-[#3b82f6] text-white rounded-br-md'
            : 'bg-[#18181b] text-[#fafafa] border border-[#27272a] rounded-bl-md'
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{content}</div>
        ) : (
          <div className="prose-chat break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-[#fafafa]">{children}</strong>,
                em: ({ children }) => <em className="italic text-[#a1a1aa]">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-[#a1a1aa]">{children}</li>,
                code: ({ className, children, ...props }) => {
                  const isBlock = className?.includes('language-');
                  if (isBlock) {
                    return (
                      <pre className="bg-[#09090b] rounded-lg p-3 my-2 overflow-x-auto">
                        <code className="text-xs font-mono text-[#a1a1aa]">{children}</code>
                      </pre>
                    );
                  }
                  return (
                    <code className="bg-[#09090b] px-1.5 py-0.5 rounded text-xs font-mono text-[#3b82f6]" {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <>{children}</>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] underline hover:text-[#3b82f6]/80">
                    {children}
                  </a>
                ),
                h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-[#fafafa]">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 text-[#fafafa]">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-[#fafafa]">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[#3b82f6]/50 pl-3 my-2 text-[#a1a1aa] italic">{children}</blockquote>
                ),
                hr: () => <hr className="border-[#27272a] my-3" />,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="text-xs w-full">{children}</table>
                  </div>
                ),
                th: ({ children }) => <th className="text-left px-2 py-1 border-b border-[#27272a] text-[#a1a1aa] font-medium">{children}</th>,
                td: ({ children }) => <td className="px-2 py-1 border-b border-[#27272a]/50 text-[#a1a1aa]">{children}</td>,
              }}
            >
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#3b82f6] animate-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
