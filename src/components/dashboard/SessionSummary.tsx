'use client';

interface SessionSummaryProps {
  summary: any;
}

const HIRING_SIGNAL_COLORS: Record<string, { bg: string; text: string }> = {
  strong_yes: { bg: '#34d39920', text: '#34d399' },
  yes: { bg: '#34d39915', text: '#34d399' },
  lean_yes: { bg: '#34d39910', text: '#34d399' },
  lean_no: { bg: '#fb923c10', text: '#fb923c' },
  no: { bg: '#f8717110', text: '#f87171' },
  strong_no: { bg: '#f8717120', text: '#f87171' },
};

export function SessionSummary({ summary }: SessionSummaryProps) {
  const content = summary?.content;
  if (!content) return null;

  const hiringColors = HIRING_SIGNAL_COLORS[content.hiring_signal] || { bg: '#18181b', text: '#a1a1aa' };

  return (
    <div className="mx-6 rounded-xl border border-[#27272a] bg-[#111114] p-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-[#fafafa] mb-4">Session Complete: Summary</h2>

      {/* Score + Hiring Signal */}
      <div className="flex items-center gap-8 mb-6">
        <div>
          <span className="text-[11px] uppercase tracking-wide text-[#71717a]">Overall Score</span>
          <div className="text-3xl font-bold text-[#fafafa] font-mono">{content.overall_score}<span className="text-lg text-[#71717a]">/10</span></div>
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-wide text-[#71717a]">Hiring Signal</span>
          <div
            className="mt-1 px-3 py-1 rounded-lg text-sm font-medium uppercase tracking-wide"
            style={{ backgroundColor: hiringColors.bg, color: hiringColors.text }}
          >
            {content.hiring_signal?.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* One-line summary */}
      {content.one_line_summary && (
        <p className="text-sm text-[#a1a1aa] mb-6 italic">&ldquo;{content.one_line_summary}&rdquo;</p>
      )}

      {/* Rubric Scores */}
      {content.rubric_scores?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-wide text-[#71717a] mb-3">Rubric Scores</h3>
          <div className="space-y-2">
            {content.rubric_scores.map((score: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-[#a1a1aa] w-[180px] truncate">{score.criterion}</span>
                <span className="text-[10px] text-[#71717a] font-mono w-[40px]">{score.weight}%</span>
                <div className="flex-1 h-2 bg-[#18181b] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${score.score * 10}%`,
                      backgroundColor: score.score >= 7 ? '#34d399' : score.score >= 5 ? '#fb923c' : '#f87171',
                    }}
                  />
                </div>
                <span className="text-sm font-mono text-[#fafafa] w-[30px] text-right">{score.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths + Concerns + Follow-ups */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-[#09090b] border border-[#1e1e22] p-4">
          <h4 className="text-xs uppercase tracking-wide text-[#34d399] mb-2">Strengths</h4>
          <ul className="space-y-1">
            {content.strengths?.map((s: string, i: number) => (
              <li key={i} className="text-xs text-[#a1a1aa]">{s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-[#09090b] border border-[#1e1e22] p-4">
          <h4 className="text-xs uppercase tracking-wide text-[#f87171] mb-2">Concerns</h4>
          <ul className="space-y-1">
            {content.concerns?.map((c: string, i: number) => (
              <li key={i} className="text-xs text-[#a1a1aa]">{c}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-[#09090b] border border-[#1e1e22] p-4">
          <h4 className="text-xs uppercase tracking-wide text-[#3b82f6] mb-2">Follow-ups</h4>
          <ul className="space-y-1">
            {content.recommended_follow_ups?.map((f: string, i: number) => (
              <li key={i} className="text-xs text-[#a1a1aa]">{i + 1}. {f}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
