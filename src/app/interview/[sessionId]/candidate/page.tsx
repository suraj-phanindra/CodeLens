'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Clock, Loader2, Square, TerminalSquare, FileText, Play, Save, Send, CheckCircle, ShieldX } from 'lucide-react';
import { Allotment } from 'allotment';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import FileExplorer from '@/components/ide/FileExplorer';
import TabBar from '@/components/ide/TabBar';
import EditorArea from '@/components/ide/EditorArea';
import TerminalPanel from '@/components/ide/TerminalPanel';
import OutputPanel, { type OutputPanelRef } from '@/components/ide/OutputPanel';
import StatusBar from '@/components/ide/StatusBar';
import ClaudeChat from '@/components/ide/ClaudeChat';

export default function CandidatePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  // Session state
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [sandboxReady, setSandboxReady] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  // File explorer
  const [fileList, setFileList] = useState<string[]>([]);
  const [fileListLoading, setFileListLoading] = useState(false);

  // Multi-tab editor state
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [tabContents, setTabContents] = useState<Record<string, string>>({});
  const [tabEdited, setTabEdited] = useState<Record<string, string>>({});
  const [tabDirty, setTabDirty] = useState<Record<string, boolean>>({});
  const [fileLoading, setFileLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Bottom panel: output (default) or terminal
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [outputVisible, setOutputVisible] = useState(true);
  const outputRef = useRef<OutputPanelRef>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // -- File operations --

  const fetchFileList = useCallback(async () => {
    if (!sandboxReady) return;
    setFileListLoading(true);
    try {
      const res = await fetch(`/api/sandbox/files?session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setFileList(data.files || []);
      }
    } catch (err) {
      console.error('Failed to fetch file list:', err);
    } finally {
      setFileListLoading(false);
    }
  }, [sessionId, sandboxReady]);

  const fetchFileContent = useCallback(async (path: string) => {
    setFileLoading(true);
    try {
      const res = await fetch(`/api/sandbox/files?session_id=${sessionId}&path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setTabContents((prev) => ({ ...prev, [path]: data.content }));
        setTabEdited((prev) => ({ ...prev, [path]: data.content }));
        setTabDirty((prev) => ({ ...prev, [path]: false }));
      }
    } catch (err) {
      console.error('Failed to fetch file:', err);
    } finally {
      setFileLoading(false);
    }
  }, [sessionId]);

  const openFile = useCallback((path: string) => {
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActiveTab(path);
    if (!(path in tabContents) && path !== '__CHALLENGE.md') {
      fetchFileContent(path);
    }
  }, [tabContents, fetchFileContent]);

  const closeTab = useCallback((path: string) => {
    if (tabDirty[path]) {
      if (!window.confirm('Unsaved changes will be lost. Close anyway?')) return;
    }
    setOpenTabs((prev) => {
      const next = prev.filter((p) => p !== path);
      if (activeTab === path) {
        const idx = prev.indexOf(path);
        const newActive = next[Math.min(idx, next.length - 1)] || null;
        setActiveTab(newActive);
      }
      return next;
    });
    setTabContents((prev) => { const n = { ...prev }; delete n[path]; return n; });
    setTabEdited((prev) => { const n = { ...prev }; delete n[path]; return n; });
    setTabDirty((prev) => { const n = { ...prev }; delete n[path]; return n; });
  }, [activeTab, tabDirty]);

  const handleEditorChange = useCallback((value: string) => {
    if (!activeTab) return;
    setTabEdited((prev) => ({ ...prev, [activeTab]: value }));
    setTabDirty((prev) => ({ ...prev, [activeTab]: value !== tabContents[activeTab] }));
  }, [activeTab, tabContents]);

  const saveFile = useCallback(async () => {
    if (!activeTab || !tabDirty[activeTab] || activeTab === '__CHALLENGE.md') return;
    setSaving(true);
    try {
      const res = await fetch('/api/sandbox/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, path: activeTab, content: tabEdited[activeTab] }),
      });
      if (res.ok) {
        setTabContents((prev) => ({ ...prev, [activeTab]: tabEdited[activeTab] }));
        setTabDirty((prev) => ({ ...prev, [activeTab]: false }));
      }
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setSaving(false);
    }
  }, [sessionId, activeTab, tabDirty, tabEdited]);

  const saveAllDirtyFiles = useCallback(async () => {
    const dirtyTabs = openTabs.filter(t => tabDirty[t] && t !== '__CHALLENGE.md');
    await Promise.all(dirtyTabs.map(async (path) => {
      const res = await fetch('/api/sandbox/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, path, content: tabEdited[path] }),
      });
      if (res.ok) {
        setTabContents(prev => ({ ...prev, [path]: tabEdited[path] }));
        setTabDirty(prev => ({ ...prev, [path]: false }));
      }
    }));
  }, [openTabs, tabDirty, tabEdited, sessionId]);

  const showTerminal = useCallback(() => {
    setTerminalVisible(true);
    setOutputVisible(false);
  }, []);

  const showOutput = useCallback(() => {
    setOutputVisible(true);
    setTerminalVisible(false);
  }, []);

  const openChallengeBrief = useCallback(() => {
    const path = '__CHALLENGE.md';
    const desc = session?.challenges?.description ?? '';
    if (!openTabs.includes(path)) {
      setOpenTabs((prev) => [path, ...prev]);
    }
    setActiveTab(path);
    // Re-populate caches if cleared by closeTab
    setTabContents((prev) => prev[path] !== undefined ? prev : { ...prev, [path]: desc });
    setTabEdited((prev) => prev[path] !== undefined ? prev : { ...prev, [path]: desc });
    setTabDirty((prev) => prev[path] !== undefined ? prev : { ...prev, [path]: false });
  }, [openTabs, session?.challenges?.description]);

  // -- Keyboard shortcut: Ctrl+S --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && activeTab && tabDirty[activeTab]) {
        e.preventDefault();
        saveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveFile, activeTab, tabDirty]);

  // -- Auto-fetch file list when sandbox ready --
  useEffect(() => {
    if (sandboxReady) fetchFileList();
  }, [sandboxReady, fetchFileList]);

  // -- Load session + create sandbox --
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sessions?id=${sessionId}`);
        const data = await res.json();
        setSession(data);

        if (data.status === 'completed') {
          setSessionEnded(true);
          setLoading(false);
          return;
        }

        if (data.status === 'pending') {
          const sandboxRes = await fetch('/api/sandbox/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
          });
          if (sandboxRes.ok) {
            const updatedRes = await fetch(`/api/sessions?id=${sessionId}`);
            const updated = await updatedRes.json();
            setSession(updated);
          } else {
            console.error('Sandbox creation failed:', await sandboxRes.text());
          }
          // Always mark ready — sandbox may exist from a prior attempt
          setSandboxReady(true);
        } else {
          setSandboxReady(true);
        }

        await fetch('/api/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, action: 'start' }),
        });
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  // -- Open challenge brief as first tab --
  useEffect(() => {
    if (!session?.challenges?.description) return;
    const path = '__CHALLENGE.md';
    setTabContents((prev) => ({ ...prev, [path]: session.challenges.description }));
    setTabEdited((prev) => ({ ...prev, [path]: session.challenges.description }));
    setTabDirty((prev) => ({ ...prev, [path]: false }));
    if (!openTabs.includes(path)) {
      setOpenTabs((prev) => prev.includes(path) ? prev : [path, ...prev]);
      setActiveTab(path);
    }
  }, [session?.challenges?.description]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Timer --
  useEffect(() => {
    if (!session?.started_at) return;
    const start = new Date(session.started_at).getTime();
    if (sessionEnded && session.ended_at) {
      setElapsed(Math.floor((new Date(session.ended_at).getTime() - start) / 1000));
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.started_at, session?.ended_at, sessionEnded]);

  // -- Realtime: session end + file changes --
  useEffect(() => {
    const supabase = createClient();

    const sessionChannel = supabase
      .channel(`session-status:${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload: any) => {
        if (payload.new.status === 'completed') {
          setSessionEnded(true);
        }
      })
      .subscribe();

    const eventsChannel = supabase
      .channel(`file-changes:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `session_id=eq.${sessionId}`,
      }, (payload: any) => {
        if (payload.new.event_type === 'file_change') {
          setTimeout(() => {
            fetchFileList();
            const changedName = payload.new.metadata?.name;
            if (changedName) {
              setOpenTabs((tabs) => {
                tabs.forEach((tabPath) => {
                  if (tabPath.endsWith(changedName)) {
                    setTabDirty((d) => {
                      if (!d[tabPath]) fetchFileContent(tabPath);
                      return d;
                    });
                  }
                });
                return tabs;
              });
            }
          }, 300);
        }
      })
      .subscribe();

    return () => {
      sessionChannel.unsubscribe();
      eventsChannel.unsubscribe();
    };
  }, [sessionId, fetchFileList, fetchFileContent]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Current tab data
  const currentContent = activeTab ? (tabEdited[activeTab] ?? '') : '';
  const currentDirty = activeTab ? (tabDirty[activeTab] ?? false) : false;
  const isReadOnly = activeTab === '__CHALLENGE.md';
  const tabs = openTabs.map((path) => ({ path, dirty: tabDirty[path] ?? false }));

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
      </div>
    );
  }

  // Block access to completed sessions — interviewer can still view the dashboard
  if (sessionEnded && !sandboxReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#71717a]/20 flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-7 h-7 text-[#71717a]" />
          </div>
          <h2 className="text-xl font-semibold text-[#fafafa] mb-2">Session Closed</h2>
          <p className="text-[#a1a1aa] text-sm">
            This interview session has been submitted and is no longer accessible. The interviewer can review your work on the dashboard.
          </p>
        </div>
      </div>
    );
  }

  const challenge = session?.challenges;

  return (
    <div className="h-screen flex flex-col bg-[#09090b] relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#1e1e22] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Image src="/atrium-logo.png" alt="Atrium" width={28} height={28} className="rounded-lg" />
          <span className="text-[#fafafa] font-semibold text-sm">
            {challenge?.title || 'Coding Challenge'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!outputVisible) showOutput();
              await saveAllDirtyFiles();
              setTimeout(() => outputRef.current?.run(), 0);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/20"
          >
            <Play className="w-3.5 h-3.5" />
            Run
          </button>
          <button
            onClick={saveFile}
            disabled={!activeTab || !tabDirty[activeTab] || saving}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors',
              activeTab && tabDirty[activeTab]
                ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6]/20'
                : 'bg-[#18181b] border-[#27272a] text-[#52525b] cursor-not-allowed'
            )}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={showOutput}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors',
              outputVisible
                ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]'
                : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa]'
            )}
          >
            <Play className="w-3 h-3" />
            Output
          </button>
          <button
            onClick={showTerminal}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors',
              terminalVisible
                ? 'bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]'
                : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa]'
            )}
          >
            <TerminalSquare className="w-3.5 h-3.5" />
            Terminal
          </button>
          {challenge?.description && (
            <button
              onClick={openChallengeBrief}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors',
                activeTab === '__CHALLENGE.md'
                  ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]'
                  : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa]'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              Brief
            </button>
          )}
          <button
            onClick={async () => {
              if (submitted) return;
              setSubmitted(true);
              await fetch('/api/sandbox/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId }),
              });
            }}
            disabled={!canSubmit || submitted}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-all',
              canSubmit && !submitted
                ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/20 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                : 'bg-[#18181b] border-[#27272a] text-[#52525b] cursor-not-allowed'
            )}
          >
            {submitted ? <CheckCircle className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            {submitted ? 'Submitted' : 'Submit'}
          </button>
          <div className="flex items-center gap-2 text-[#a1a1aa] ml-2">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">{formatTime(elapsed)}</span>
            <span className="text-[#71717a] text-[10px]">/ {session?.duration_minutes || 45}m</span>
          </div>
        </div>
      </header>

      {/* IDE Layout */}
      <div className="flex-1 min-h-0">
        <Allotment>
          <Allotment.Pane minSize={180} preferredSize={220}>
            <FileExplorer
              files={fileList}
              loading={fileListLoading}
              activeFile={activeTab}
              openFiles={openTabs}
              onSelectFile={openFile}
              onRefresh={fetchFileList}
            />
          </Allotment.Pane>
          <Allotment.Pane>
            <Allotment vertical>
              <Allotment.Pane>
                <div className="flex flex-col h-full">
                  <TabBar
                    tabs={tabs}
                    activeTab={activeTab}
                    onSelectTab={setActiveTab}
                    onCloseTab={closeTab}
                  />
                  <EditorArea
                    activeTab={activeTab}
                    content={currentContent}
                    loading={fileLoading && activeTab !== '__CHALLENGE.md'}
                    readOnly={isReadOnly}
                    onChange={handleEditorChange}
                  />
                </div>
              </Allotment.Pane>
              {outputVisible && (
                <Allotment.Pane minSize={100} preferredSize={280}>
                  <OutputPanel
                    ref={outputRef}
                    sessionId={sessionId}
                    onCanSubmitChange={setCanSubmit}
                    onSubmit={() => setSubmitted(true)}
                  />
                </Allotment.Pane>
              )}
              {terminalVisible && (
                <Allotment.Pane minSize={100} preferredSize={280}>
                  <TerminalPanel sessionId={sessionId} sandboxReady={sandboxReady} />
                </Allotment.Pane>
              )}
            </Allotment>
          </Allotment.Pane>
          <Allotment.Pane minSize={280} preferredSize={360}>
            <ClaudeChat sessionId={sessionId} challengeDescription={challenge?.description} />
          </Allotment.Pane>
        </Allotment>
      </div>

      <StatusBar activeFile={activeTab} dirty={currentDirty} saving={saving} />

      {/* Session ended overlay */}
      {(sessionEnded || submitted) && (
        <div className="absolute inset-0 z-50 bg-[#09090b]/90 flex items-center justify-center">
          <div className="text-center">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
              submitted ? 'bg-[#22c55e]/20' : 'bg-[#3b82f6]/20'
            )}>
              {submitted ? <CheckCircle className="w-7 h-7 text-[#22c55e]" /> : <Square className="w-7 h-7 text-[#3b82f6]" />}
            </div>
            <h2 className="text-xl font-semibold text-[#fafafa] mb-2">
              {submitted ? 'Solution Submitted' : 'Interview Ended'}
            </h2>
            <p className="text-[#a1a1aa] text-sm max-w-md">
              {submitted
                ? 'Your solution has been submitted successfully. The interviewer will review your work.'
                : 'This interview session was ended by the interviewer. If you believe this is an error, please contact them.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
