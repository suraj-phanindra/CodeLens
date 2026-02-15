import { Sandbox } from 'e2b';
import { getOrReconnectSandbox } from '../create/route';
import { supabaseAdmin } from '@/lib/supabase/server';

const TEST_FILE_PATTERNS = [
  /^test_/,           // test_main.py
  /_test\./,          // main_test.py
  /\.test\./,         // main.test.js
  /\.spec\./,         // main.spec.ts
  /^tests\//,         // tests/ directory
  /^__tests__\//,     // __tests__/ directory
  /^\.codelens/,      // internal config
  /conftest\.py$/,    // pytest fixtures
  /jest\.config/,     // jest config
  /pytest\.ini$/,     // pytest config
  /\.pytest_cache/,   // pytest cache
];

function isTestFile(path: string): boolean {
  const filename = path.includes('/') ? path.split('/').pop()! : path;
  return TEST_FILE_PATTERNS.some(p => p.test(filename) || p.test(path));
}

async function listFiles(sandbox: Sandbox): Promise<string[]> {
  const result = await sandbox.commands.run(
    'find /home/user/project -type f -not -path "*/node_modules/*" -not -path "*/.*" | sort',
    { timeoutMs: 5000 }
  );
  if (!result.stdout) return [];
  return result.stdout
    .split('\n')
    .filter(Boolean)
    .map((f: string) => f.replace('/home/user/project/', ''))
    .filter(f => !isTestFile(f));
}

async function getFilesFromDB(sessionId: string): Promise<string[]> {
  const supabase = supabaseAdmin();
  const { data: session } = await supabase
    .from('sessions')
    .select('challenge_id')
    .eq('id', sessionId)
    .single();
  if (!session?.challenge_id) return [];

  const { data: challenge } = await supabase
    .from('challenges')
    .select('generated_files')
    .eq('id', session.challenge_id)
    .single();
  if (!challenge?.generated_files) return [];
  return Object.keys(challenge.generated_files).filter(f => !isTestFile(f));
}

async function readFileFromDB(sessionId: string, filePath: string): Promise<string | null> {
  const supabase = supabaseAdmin();
  const { data: session } = await supabase
    .from('sessions')
    .select('challenge_id')
    .eq('id', sessionId)
    .single();
  if (!session?.challenge_id) return null;

  const { data: challenge } = await supabase
    .from('challenges')
    .select('generated_files')
    .eq('id', session.challenge_id)
    .single();
  return challenge?.generated_files?.[filePath] ?? null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');
    const filePath = url.searchParams.get('path');

    if (!sessionId) {
      return Response.json({ error: 'session_id required' }, { status: 400 });
    }

    const sandboxInfo = await getOrReconnectSandbox(sessionId);
    const sandbox = sandboxInfo?.sandbox as Sandbox | undefined;

    if (filePath) {
      if (isTestFile(filePath)) {
        return Response.json({ error: 'File not found' }, { status: 404 });
      }
      if (sandbox) {
        try {
          const content = await sandbox.files.read(`/home/user/project/${filePath}`);
          return Response.json({ path: filePath, content });
        } catch { /* fall through to DB */ }
      }
      const content = await readFileFromDB(sessionId, filePath);
      if (content !== null) return Response.json({ path: filePath, content });
      return Response.json({ error: 'File not found' }, { status: 404 });
    }

    let files: string[] = [];
    if (sandbox) {
      try { files = await listFiles(sandbox); } catch { /* fall through */ }
    }
    if (files.length === 0) {
      files = await getFilesFromDB(sessionId);
    }

    return Response.json({ files });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { session_id, path, content } = await req.json();
    if (!session_id || !path || content === undefined) {
      return Response.json({ error: 'session_id, path, and content required' }, { status: 400 });
    }

    const sandboxInfo = await getOrReconnectSandbox(session_id);
    if (!sandboxInfo?.sandbox) {
      return Response.json({ error: 'No active sandbox' }, { status: 404 });
    }

    await sandboxInfo.sandbox.files.write(`/home/user/project/${path}`, content);
    return Response.json({ success: true, path });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
