import { getOrReconnectSandbox, forceReconnectSandbox } from '../create/route';

export async function POST(req: Request) {
  try {
    const { session_id, data } = await req.json();

    let sandboxInfo = await getOrReconnectSandbox(session_id);
    if (!sandboxInfo?.capture?.pty) {
      return Response.json({ error: 'No active sandbox' }, { status: 404 });
    }

    try {
      await sandboxInfo.capture.pty.sendInput(data);
    } catch {
      // PTY stale (hot reload) — force reconnect and retry once
      sandboxInfo = await forceReconnectSandbox(session_id);
      if (!sandboxInfo?.capture?.pty) {
        return Response.json({ error: 'Sandbox reconnection failed' }, { status: 503 });
      }
      await sandboxInfo.capture.pty.sendInput(data);
    }

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
