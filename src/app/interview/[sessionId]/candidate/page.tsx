'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Clock, ChevronDown, ChevronUp, Loader2, FolderOpen, X, Save, RotateCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const Terminal = dynamic(() => import('@/components/terminal/Terminal'), { ssr: false });

export default function CandidatePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBrief, setShowBrief] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [sandboxReady, setSandboxReady] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileList, setFileList] = useState<string[]>([]);
  const [fileContent, setFileContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [fileListLoading, setFileListLoading] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Fetch file list from live sandbox
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

  // Fetch file content from live sandbox
  const fetchFileContent = useCallback(async (path: string) => {
    setFileLoading(true);
    setDirty(false);
    try {
      const res = await fetch(`/api/sandbox/files?session_id=${sessionId}&path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
        setEditedContent(data.content);
      }
    } catch (err) {
      console.error('Failed to fetch file:', err);
    } finally {
      setFileLoading(false);
    }
  }, [sessionId]);

  // Save file to sandbox
  const saveFile = useCallback(async () => {
    if (!selectedFile || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch('/api/sandbox/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, path: selectedFile, content: editedContent }),
      });
      if (res.ok) {
        setFileContent(editedContent);
        setDirty(false);
      }
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setSaving(false);
    }
  }, [sessionId, selectedFile, editedContent, dirty]);

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && dirty && selectedFile) {
        e.preventDefault();
        saveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveFile, dirty, selectedFile]);

  // Load file when selected
  useEffect(() => {
    if (selectedFile) {
      fetchFileContent(selectedFile);
    }
  }, [selectedFile, fetchFileContent]);

  // Fetch file list when sandbox is ready or files panel is opened
  useEffect(() => {
    if (sandboxReady && showFiles) {
      fetchFileList();
    }
  }, [sandboxReady, showFiles, fetchFileList]);

  // Fetch session data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sessions?id=${sessionId}`);
        const data = await res.json();
        setSession(data);

        if (data.status === 'pending') {
          const sandboxRes = await fetch('/api/sandbox/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
          });
          if (sandboxRes.ok) {
            setSandboxReady(true);
            const updatedRes = await fetch(`/api/sessions?id=${sessionId}`);
            const updated = await updatedRes.json();
            setSession(updated);
          }
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

  // Timer
  useEffect(() => {
    if (!session?.started_at) return;
    const start = new Date(session.started_at).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.started_at]);

  // Listen for session end + file changes via Supabase Realtime
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

    // Refresh file list when file changes happen in sandbox
    const eventsChannel = supabase
      .channel(`file-changes:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `session_id=eq.${sessionId}`,
      }, (payload: any) => {
        if (payload.new.event_type === 'file_change') {
          // Debounce: refresh file list after a short delay
          setTimeout(() => {
            if (showFiles) fetchFileList();
            // If the changed file is currently open, refresh its content
            if (selectedFile && payload.new.metadata?.name) {
              const changedName = payload.new.metadata.name;
              if (selectedFile.endsWith(changedName) && !dirty) {
                fetchFileContent(selectedFile);
              }
            }
          }, 300);
        }
      })
      .subscribe();

    return () => {
      sessionChannel.unsubscribe();
      eventsChannel.unsubscribe();
    };
  }, [sessionId, showFiles, selectedFile, dirty, fetchFileList, fetchFileContent]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleEditorChange = (value: string) => {
    setEditedContent(value);
    setDirty(value !== fileContent);
  };

  const handleSelectFile = (path: string) => {
    if (dirty && selectedFile) {
      const confirmDiscard = window.confirm('You have unsaved changes. Discard them?');
      if (!confirmDiscard) return;
    }
    setSelectedFile(selectedFile === path ? null : path);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
      </div>
    );
  }

  const challenge = session?.challenges;

  return (
    <div className="h-screen flex flex-col bg-[#09090b] relative">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#1e1e22]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#a78bfa] flex items-center justify-center">
            <span className="text-white text-sm font-bold">{'\u25B8'}</span>
          </div>
          <span className="text-[#fafafa] font-semibold">
            {challenge?.title || 'Coding Challenge'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFiles(!showFiles)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
              showFiles
                ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]'
                : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa]'
            )}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Files
          </button>
          <div className="flex items-center gap-2 text-[#a1a1aa]">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">{formatTime(elapsed)}</span>
            <span className="text-[#71717a] text-xs">/ {session?.duration_minutes || 45}m</span>
          </div>
        </div>
      </header>

      {/* Challenge Brief */}
      {challenge?.description && (
        <div className="border-b border-[#1e1e22]">
          <button
            onClick={() => setShowBrief(!showBrief)}
            className="w-full flex items-center justify-between px-6 py-2 text-sm text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
          >
            <span>Challenge Brief</span>
            {showBrief ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showBrief && (
            <div className="px-6 pb-4 text-sm text-[#a1a1aa] max-h-48 overflow-y-auto whitespace-pre-wrap">
              {challenge.description}
            </div>
          )}
        </div>
      )}

      {/* Main content: file panel + editor + terminal */}
      <main className="flex-1 flex flex-row overflow-hidden">
        {/* File tree panel */}
        {showFiles && (
          <div className="w-56 border-r border-[#1e1e22] bg-[#111114] overflow-y-auto flex-shrink-0">
            <div className="flex items-center justify-between p-3">
              <span className="text-xs text-[#71717a] uppercase tracking-wide font-medium">Files</span>
              <button
                onClick={fetchFileList}
                disabled={fileListLoading}
                className="text-[#71717a] hover:text-[#fafafa] transition-colors"
                title="Refresh file list"
              >
                <RotateCw className={cn('w-3 h-3', fileListLoading && 'animate-spin')} />
              </button>
            </div>
            {fileList.length === 0 && !fileListLoading && (
              <div className="px-3 py-2 text-xs text-[#52525b]">No files found</div>
            )}
            {fileListLoading && fileList.length === 0 && (
              <div className="px-3 py-2 text-xs text-[#52525b] flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading...
              </div>
            )}
            {fileList.map((path: string) => (
              <button
                key={path}
                onClick={() => handleSelectFile(path)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-[#18181b] transition-colors truncate',
                  selectedFile === path ? 'bg-[#18181b] text-[#fafafa]' : 'text-[#a1a1aa]'
                )}
                title={path}
              >
                {path}
              </button>
            ))}
          </div>
        )}

        {/* File editor */}
        {selectedFile && (
          <div className="w-[480px] border-r border-[#1e1e22] bg-[#09090b] flex flex-col flex-shrink-0">
            {/* Editor header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e22] flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-[#a1a1aa] font-mono truncate">{selectedFile}</span>
                {dirty && <span className="w-2 h-2 rounded-full bg-[#f59e0b] flex-shrink-0" title="Unsaved changes" />}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={saveFile}
                  disabled={!dirty || saving}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
                    dirty
                      ? 'bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90'
                      : 'bg-[#18181b] text-[#52525b] cursor-not-allowed'
                  )}
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save
                </button>
                <button
                  onClick={() => { setSelectedFile(null); setDirty(false); }}
                  className="text-[#71717a] hover:text-[#fafafa] transition-colors p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Editor body */}
            {fileLoading ? (
              <div className="flex-1 flex items-center justify-center text-[#52525b] text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Loading file...
              </div>
            ) : (
              <textarea
                ref={editorRef}
                value={editedContent}
                onChange={(e) => handleEditorChange(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full p-3 text-xs font-mono text-[#d4d4d8] bg-transparent resize-none outline-none leading-relaxed"
                style={{ tabSize: 2 }}
              />
            )}

            {/* Editor footer */}
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#1e1e22] text-[10px] text-[#52525b] flex-shrink-0">
              <span>{dirty ? 'Modified' : 'Saved'}</span>
              <span>Ctrl+S to save</span>
            </div>
          </div>
        )}

        {/* Terminal */}
        <div className="flex-1 p-4 overflow-hidden">
          {sandboxReady ? (
            <Terminal sessionId={sessionId} />
          ) : (
            <div className="flex items-center justify-center h-full text-[#71717a]">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Setting up your environment...
            </div>
          )}
        </div>
      </main>

      {/* Session ended overlay */}
      {sessionEnded && (
        <div className="absolute inset-0 z-50 bg-[#09090b]/90 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#34d399]/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-[#34d399] text-2xl">&#10003;</span>
            </div>
            <h2 className="text-xl font-semibold text-[#fafafa] mb-2">Session Complete</h2>
            <p className="text-[#a1a1aa] text-sm">Thank you for completing the interview. You may close this page.</p>
          </div>
        </div>
      )}
    </div>
  );
}
