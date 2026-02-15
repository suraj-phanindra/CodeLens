'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function DashboardRoute() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sessions?id=${sessionId}`);
        if (!res.ok) throw new Error('Session not found');
        const data = await res.json();
        setSession(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  // Subscribe to session status changes via Supabase Realtime
  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`session-dash:${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload: any) => {
        setSession((prev: any) => prev ? { ...prev, ...payload.new } : prev);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
          <span className="text-sm text-[#71717a]">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#fafafa] mb-2">Session Not Found</h2>
          <p className="text-sm text-[#71717a]">{error || 'Could not load session data'}</p>
        </div>
      </div>
    );
  }

  return <DashboardPage session={session} />;
}
