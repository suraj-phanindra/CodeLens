'use client';

const PRIORITY_COLORS: Record<string, string> = {
  high: '#f87171',
  medium: '#fb923c',
  low: '#34d399',
};

interface CopilotCardProps {
  question: any | null;
}

export function CopilotCard({ question }: CopilotCardProps) {
  const content = question?.content;
  const priorityColor = content ? PRIORITY_COLORS[content.priority] || '#71717a' : '#71717a';

  return (
    <div className="flex-[0.8] rounded-xl bg-[#111114] border border-[#27272a] p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-[#f472b6]" />
        <span className="text-xs font-medium text-[#f472b6]">Copilot Suggestion</span>
        {question?.timestamp && (
          <span className="text-[11px] font-mono text-[#71717a] ml-auto">
            {new Date(question.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {content ? (
        <div className="space-y-3">
          <p className="text-sm text-[#fafafa] leading-relaxed">{content.question}</p>
          <p className="text-xs text-[#71717a] leading-relaxed">{content.context}</p>

          <div className="flex items-center gap-2">
            <span
              className="text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wide"
              style={{
                backgroundColor: `${priorityColor}15`,
                color: priorityColor,
                border: `1px solid ${priorityColor}30`,
              }}
            >
              {content.priority}
            </span>
            <span className="text-[10px] text-[#71717a]">
              {content.rubric_criterion}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button className="px-3 py-1.5 text-[11px] rounded-lg bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] transition-colors">
              Dismiss
            </button>
            <button className="px-3 py-1.5 text-[11px] rounded-lg bg-[#f472b6] text-white hover:bg-[#f472b6]/90 transition-colors">
              Ask
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#71717a] italic">No suggestions yet. Opus 4.6 is watching.</p>
      )}
    </div>
  );
}
