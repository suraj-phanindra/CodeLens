'use client';

import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Play, Trash2, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutputPanelProps {
  sessionId: string;
}

export interface OutputPanelRef {
  run: () => void;
}

const OutputPanel = forwardRef<OutputPanelRef, OutputPanelProps>(({ sessionId }, ref) => {
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');

  const run = useCallback(async () => {
    setIsRunning(true);
    setOutput('');
    try {
      const res = await fetch('/api/sandbox/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOutput(`Error: ${data.error}`);
        return;
      }

      setLastCommand(data.command);
      const lines: string[] = [];
      lines.push(`$ ${data.command}`);
      if (data.stdout) lines.push(data.stdout);
      if (data.stderr) lines.push(`\x1b[stderr]\n${data.stderr}`);
      lines.push(`\nProcess exited with code ${data.exitCode}`);
      setOutput(lines.join('\n'));
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [sessionId]);

  useImperativeHandle(ref, () => ({ run }), [run]);

  const clear = useCallback(() => {
    setOutput('');
    setLastCommand('');
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#09090b]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1e1e22] flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-[#22c55e]" />
          <span className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">Output</span>
          {lastCommand && (
            <span className="text-[10px] text-[#52525b] ml-2 font-mono truncate max-w-[200px]">{lastCommand}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={run}
            disabled={isRunning}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 text-[10px] rounded transition-colors',
              isRunning
                ? 'bg-[#22c55e]/10 text-[#22c55e]/50 cursor-not-allowed'
                : 'bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20'
            )}
          >
            <Play className="w-3 h-3" />
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button
            onClick={clear}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[#71717a] hover:text-[#a1a1aa] rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3 font-mono text-xs leading-5">
        {output ? (
          <pre className="whitespace-pre-wrap">
            {output.split('\n').map((line, i) => {
              const isStderr = line.includes('\x1b[stderr]');
              const isCommand = line.startsWith('$ ');
              const isExit = line.startsWith('Process exited');
              if (isStderr) return null;
              return (
                <div
                  key={i}
                  className={cn(
                    isCommand && 'text-[#3b82f6]',
                    isExit && 'text-[#71717a] mt-1',
                    !isCommand && !isExit && output.includes('\x1b[stderr]') && i > output.split('\n').indexOf('\x1b[stderr]')
                      ? 'text-[#f97316]'
                      : !isCommand && !isExit && 'text-[#e4e4e7]'
                  )}
                >
                  {line}
                </div>
              );
            })}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full text-[#52525b] text-xs">
            {isRunning ? (
              <span className="animate-pulse">Running...</span>
            ) : (
              <span>Click Run to execute your code</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

OutputPanel.displayName = 'OutputPanel';
export default OutputPanel;
