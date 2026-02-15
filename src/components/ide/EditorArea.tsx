'use client';

import { FileCode, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeEditor from '@/components/editor/CodeEditor';

interface EditorAreaProps {
  activeTab: string | null;
  content: string;
  loading: boolean;
  readOnly?: boolean;
  onChange: (value: string) => void;
}

export default function EditorArea({ activeTab, content, loading, readOnly, onChange }: EditorAreaProps) {
  if (!activeTab) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#52525b] gap-3">
        <FileCode className="w-10 h-10 opacity-30" />
        <p className="text-sm">Select a file from the explorer</p>
        <p className="text-xs text-[#3f3f46]">or open a file tab to start editing</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#52525b] text-xs">
        <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Loading file...
      </div>
    );
  }

  if (activeTab === '__CHALLENGE.md') {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#09090b] p-6">
        <div className="max-w-3xl mx-auto prose prose-invert prose-sm prose-headings:text-[#fafafa] prose-headings:font-semibold prose-p:text-[#d4d4d8] prose-strong:text-[#fafafa] prose-code:text-[#a78bfa] prose-code:bg-[#18181b] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-[#111114] prose-pre:border prose-pre:border-[#27272a] prose-li:text-[#d4d4d8] prose-a:text-[#3b82f6] prose-hr:border-[#27272a]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0">
      <CodeEditor path={activeTab} content={content} onChange={onChange} readOnly={readOnly} />
    </div>
  );
}
