import { ChatInterface } from '@/components/chat';

export default function SetupPage() {
  return (
    <div className="h-screen flex flex-col bg-[#09090b]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#1e1e22]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#a78bfa] flex items-center justify-center">
            <span className="text-white text-sm font-bold">{'\u25B8'}</span>
          </div>
          <span className="text-[#fafafa] font-semibold">Atrium</span>
          <span className="text-[#71717a] text-sm">/ Design your interview</span>
        </div>
      </header>

      {/* Chat */}
      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  );
}
