import { Sandbox } from 'e2b';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createInterviewSandbox } from '@/lib/e2b/sandbox';
import { startActivityCapture } from '@/lib/e2b/monitor';

const activeSandboxes = new Map<string, any>();

async function reconnectSandbox(sessionId: string): Promise<any | null> {
  const supabase = supabaseAdmin();
  const { data: session } = await supabase
    .from('sessions')
    .select('sandbox_id, status')
    .eq('id', sessionId)
    .single();

  if (!session?.sandbox_id || session.status === 'completed') return null;

  try {
    const sandbox = await Sandbox.connect(session.sandbox_id);
    const capture = await startActivityCapture(sandbox, sessionId);
    const info = { sandbox, capture };
    activeSandboxes.set(sessionId, info);
    return info;
  } catch {
    return null;
  }
}

export function invalidateSandbox(sessionId: string) {
  activeSandboxes.delete(sessionId);
}

export async function getOrReconnectSandbox(sessionId: string): Promise<any | null> {
  const existing = activeSandboxes.get(sessionId);
  if (existing?.capture?.pty) return existing;
  return reconnectSandbox(sessionId);
}

export async function forceReconnectSandbox(sessionId: string): Promise<any | null> {
  activeSandboxes.delete(sessionId);
  return reconnectSandbox(sessionId);
}

export async function POST(req: Request) {
  try {
    const { session_id } = await req.json();
    const supabase = supabaseAdmin();

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*, challenges(*)')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const challenge = (session as any).challenges;
    if (!challenge) {
      return Response.json({ error: 'No challenge associated with session' }, { status: 400 });
    }

    const { sandboxId, sandbox } = await createInterviewSandbox(
      challenge.generated_files,
      challenge.description
    );

    const capture = await startActivityCapture(sandbox, session_id);
    activeSandboxes.set(session_id, { sandbox, capture });

    await supabase.from('sessions').update({
      sandbox_id: sandboxId,
      status: 'active',
      started_at: new Date().toISOString(),
    }).eq('id', session_id);

    await supabase.from('events').insert({
      session_id,
      event_type: 'session_start',
      raw_content: 'Interview session started',
    });

    return Response.json({
      sandbox_id: sandboxId,
      pty_pid: capture.pty.pid,
      status: 'active',
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export { activeSandboxes };
