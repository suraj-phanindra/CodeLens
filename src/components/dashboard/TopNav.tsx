import { cn } from '@/lib/utils';

export function TopNav() {
  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-[#1e1e22] animate-fade-in">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#a78bfa] flex items-center justify-center">
            <span className="text-white text-sm font-bold">&#9654;</span>
          </div>
          <span className="text-[#fafafa] font-semibold tracking-tight">Atrium</span>
        </div>
        <div className="flex items-center gap-1">
          {['Dashboard', 'Sessions', 'Settings'].map((item, i) => (
            <button
              key={item}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                i === 0 ? 'bg-[#1e1e22] text-[#fafafa]' : 'text-[#71717a] hover:text-[#a1a1aa]'
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-[#71717a] bg-[#18181b] border border-[#27272a] px-2 py-1 rounded font-mono">&#8984;K</span>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#a78bfa] flex items-center justify-center text-white text-xs font-medium">
          S
        </div>
      </div>
    </nav>
  );
}
