import { activeSandboxes } from '../create/route';

// GET: list files or read a single file
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');
    const filePath = url.searchParams.get('path');

    if (!sessionId) {
      return Response.json({ error: 'session_id required' }, { status: 400 });
    }

    const sandboxInfo = activeSandboxes.get(sessionId);
    if (!sandboxInfo) {
      return Response.json({ error: 'No active sandbox for this session' }, { status: 404 });
    }

    const { sandbox } = sandboxInfo;

    if (filePath) {
      // Read a single file
      const content = await sandbox.files.read(`/home/user/project/${filePath}`);
      return Response.json({ path: filePath, content });
    } else {
      // List all files recursively
      const files = await listFilesRecursive(sandbox, '/home/user/project', '');
      return Response.json({ files });
    }
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PUT: write a file
export async function PUT(req: Request) {
  try {
    const { session_id, path, content } = await req.json();

    if (!session_id || !path || content === undefined) {
      return Response.json({ error: 'session_id, path, and content required' }, { status: 400 });
    }

    const sandboxInfo = activeSandboxes.get(session_id);
    if (!sandboxInfo) {
      return Response.json({ error: 'No active sandbox for this session' }, { status: 404 });
    }

    const { sandbox } = sandboxInfo;
    await sandbox.files.write(`/home/user/project/${path}`, content);

    return Response.json({ success: true, path });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function listFilesRecursive(sandbox: any, basePath: string, relativePath: string): Promise<string[]> {
  const fullPath = relativePath ? `${basePath}/${relativePath}` : basePath;
  const entries = await sandbox.files.list(fullPath);
  const files: string[] = [];

  for (const entry of entries) {
    const entryRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    if (entry.type === 'dir') {
      // Skip node_modules and hidden dirs
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const subFiles = await listFilesRecursive(sandbox, basePath, entryRelative);
      files.push(...subFiles);
    } else {
      files.push(entryRelative);
    }
  }

  return files;
}
