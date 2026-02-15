import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-[#1e1e22]">
        <div className="flex items-center gap-3">
          <Image src="/atrium-logo.png" alt="Atrium" width={36} height={36} className="rounded-xl" />
          <span className="text-[#fafafa] text-xl font-semibold tracking-tight">Atrium</span>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center px-8 pt-24 pb-20 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#3b82f6]/6 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fb923c]/10 border border-[#fb923c]/20 text-[#a1a1aa] text-xs font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-[#fb923c] animate-pulse shadow-[0_0_8px_2px_rgba(251,146,60,0.5)]" />
              Powered by <span className="text-[#fb923c] font-semibold">Opus 4.6</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[#fafafa] mb-6 leading-[1.1]">
              See how they{' '}
              <span className="bg-gradient-to-r from-[#3b82f6] to-[#a78bfa] bg-clip-text text-transparent">
                think.
              </span>
            </h1>

            <p className="text-lg text-[#a1a1aa] mb-10 max-w-xl mx-auto leading-relaxed">
              Atrium replaces coding puzzles with paid, real-world challenges
              and gives you an AI-powered window into how candidates actually
              reason, debug, and build.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/interview/setup"
                className="px-6 py-3 rounded-xl bg-[#3b82f6] text-white font-medium hover:bg-[#3b82f6]/90 transition-colors text-sm"
              >
                Start an Interview
              </Link>
              <a
                href="#how-it-works"
                className="px-6 py-3 rounded-xl bg-[#18181b] text-[#a1a1aa] border border-[#27272a] hover:border-[#3b82f6]/30 hover:text-[#fafafa] transition-all text-sm"
              >
                How It Works
              </a>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="px-8 py-20 flex justify-center">
          <div className="max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-[#fafafa] mb-6">
              The interview is broken. Everyone knows it.
            </h2>
            <div className="space-y-4 text-[#a1a1aa] leading-relaxed">
              <p>
                You&apos;re hiring engineers who&apos;ll debug production code, navigate
                complex systems, and make judgment calls under pressure. So why
                are you testing them on binary tree inversions?
              </p>
              <p>
                LeetCode doesn&apos;t tell you how someone thinks. Take-home projects
                don&apos;t tell you how they use tools. Whiteboard interviews don&apos;t
                tell you how they work under real conditions.
              </p>
              <p>And nobody&apos;s paying candidates for their time.</p>
            </div>
          </div>
        </section>

        {/* Solution */}
        <section className="px-8 py-20 flex justify-center">
          <div className="max-w-4xl w-full">
            <h2 className="text-3xl font-bold text-[#fafafa] mb-12 text-center">
              An interview that works like the job.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Real challenges, not puzzles.',
                  desc: 'Upload your SDK docs. Atrium\'s AI generates a realistic debugging challenge using your actual tech stack. Candidates work in a full cloud environment with real tools, including AI assistants. Because that\'s how engineering works now.',
                  color: '#3b82f6',
                },
                {
                  title: 'See the thinking, not just the output.',
                  desc: 'Atrium\'s observation layer tracks how candidates approach problems in real-time. Do they read error logs before changing code? Do they form hypotheses? Do they lean on AI or think independently? You see what no interviewer sitting across a table could ever see.',
                  color: '#22d3ee',
                },
                {
                  title: 'Pay candidates for real work.',
                  desc: 'Every Atrium interview is a paid engagement. Candidates build something real with your tools. You get signal. They get compensated. The best people won\'t grind LeetCode for free, and they shouldn\'t have to.',
                  color: '#f472b6',
                },
              ].map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-xl bg-[#111114] border border-[#27272a] p-6 hover:border-[#3b82f6]/20 transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full mb-4"
                    style={{ backgroundColor: pillar.color }}
                  />
                  <h3 className="text-[#fafafa] font-semibold mb-3">{pillar.title}</h3>
                  <p className="text-[#71717a] text-sm leading-relaxed">{pillar.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="px-8 py-20 flex justify-center">
          <div className="max-w-3xl w-full">
            <h2 className="text-3xl font-bold text-[#fafafa] mb-12 text-center">
              How it works
            </h2>
            <div className="space-y-8">
              {[
                {
                  step: '01',
                  title: 'Set up in a conversation.',
                  desc: 'Chat with Atrium\'s AI to design your interview. Upload a job description, the candidate\'s resume, and a link to your SDK docs. The AI builds a custom challenge and evaluation rubric tailored to what you actually care about.',
                  color: '#3b82f6',
                },
                {
                  step: '02',
                  title: 'Candidate builds in the open.',
                  desc: 'The candidate gets a link to a cloud sandbox with your challenge code and Claude Code. They debug, build, and ship, just like a real workday. No trick questions. No time pressure games.',
                  color: '#a78bfa',
                },
                {
                  step: '03',
                  title: 'Watch the signal, not the screen.',
                  desc: 'Your dashboard shows a live reasoning timeline: what the candidate is investigating, what hypotheses they\'re testing, how they use AI, and where they get stuck. Atrium\'s AI suggests follow-up questions based on your priorities.',
                  color: '#22d3ee',
                },
                {
                  step: '04',
                  title: 'Get a scorecard, not a gut feeling.',
                  desc: 'When the session ends, Atrium generates a comprehensive evaluation scored against your custom rubric. Strengths, concerns, AI usage patterns, and a clear hiring signal, all backed by specific evidence from the session.',
                  color: '#34d399',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-6 items-start">
                  <div
                    className="text-2xl font-bold font-mono shrink-0 w-12"
                    style={{ color: item.color }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-[#fafafa] font-semibold mb-2">{item.title}</h3>
                    <p className="text-[#71717a] text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For Candidates */}
        <section className="px-8 py-20 flex justify-center">
          <div className="max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-[#fafafa] mb-6">
              An interview that respects your time.
            </h2>
            <p className="text-[#a1a1aa] leading-relaxed">
              No more unpaid take-homes. No more whiteboard theater. Atrium
              interviews are paid, real-world challenges where you work with
              modern tools in a real environment. You&apos;re evaluated on how you
              think and build, not whether you memorized Dijkstra&apos;s algorithm.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-8 py-6 border-t border-[#1e1e22] text-center">
        <p className="text-xs text-[#71717a]">
          Built with Opus 4.6 for the Claude Code Hackathon
        </p>
      </footer>
    </div>
  );
}
