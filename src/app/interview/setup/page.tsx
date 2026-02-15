import { ChatInterface } from '@/components/chat';
import Image from 'next/image';

export default function SetupPage() {
  return (
    <div className="h-screen flex flex-col bg-[#09090b]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#1e1e22]">
        <div className="flex items-center gap-3">
          <Image src="/atrium-logo.png" alt="Atrium" width={32} height={32} className="rounded-lg" />
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
