'use client';

import { useEffect, useRef } from 'react';

interface TerminalProps {
  sessionId: string;
}

export default function TerminalComponent({ sessionId }: TerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!termRef.current || initialized.current) return;
    initialized.current = true;

    let cleanup: (() => void) | undefined;

    (async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { createClient } = await import('@/lib/supabase/client');

      if (!termRef.current) return;

      const term = new Terminal({
        cols: 120,
        rows: 40,
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
        theme: {
          background: '#09090b',
          foreground: '#a9b1d6',
          cursor: '#c0caf5',
          selectionBackground: '#3b82f640',
        },
        scrollback: 5000,
      });

      term.open(termRef.current);

      // Subscribe to terminal output from sandbox
      const supabase = createClient();
      const channel = supabase
        .channel(`terminal:${sessionId}`)
        .on('broadcast', { event: 'terminal_data' }, ({ payload }) => {
          term.write(payload.data);
        })
        .subscribe();

      // Send keystrokes to sandbox
      term.onData(async (data) => {
        await fetch('/api/sandbox/input', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, data }),
        });
      });

      cleanup = () => {
        channel.unsubscribe();
        term.dispose();
      };
    })();

    return () => {
      if (cleanup) cleanup();
    };
  }, [sessionId]);

  return (
    <div
      ref={termRef}
      className="w-full h-full rounded-lg overflow-hidden bg-[#09090b]"
    />
  );
}
