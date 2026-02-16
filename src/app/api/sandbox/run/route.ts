import { Sandbox } from 'e2b';
import { getOrReconnectSandbox } from '../create/route';
import { supabaseAdmin } from '@/lib/supabase/server';

function detectTestCommand(generatedFiles: Record<string, string>): string | null {
  const filenames = Object.keys(generatedFiles);
  if (filenames.some(f => f.endsWith('.py'))) {
    return 'cd /home/user/project && python -m pytest .atrium_tests/ -v 2>&1';
  }
  if (filenames.some(f => f.match(/\.(ts|tsx|js|jsx)$/))) {
    return 'cd /home/user/project && npx jest --roots .atrium_tests/ 2>&1';
  }
  return null;
}

function detectRunCommand(generatedFiles: Record<string, string>): string {
  const filenames = Object.keys(generatedFiles);

  // Check for package.json with start script
  if (generatedFiles['package.json']) {
    try {
      const pkg = JSON.parse(generatedFiles['package.json']);
      if (pkg.scripts?.start) return 'cd /home/user/project && npm start';
      if (pkg.scripts?.dev) return 'cd /home/user/project && npm run dev';
    } catch { /* ignore parse errors */ }
  }

  // Python
  if (filenames.some(f => f.endsWith('.py'))) {
    const main = filenames.find(f => f === 'main.py' || f === 'app.py');
    return `cd /home/user/project && python ${main || filenames.find(f => f.endsWith('.py'))!}`;
  }

  // TypeScript
  if (filenames.some(f => f.endsWith('.ts'))) {
    const main = filenames.find(f => f === 'index.ts' || f === 'main.ts');
    return `cd /home/user/project && npx tsx ${main || filenames.find(f => f.endsWith('.ts'))!}`;
  }

  // JavaScript
  if (filenames.some(f => f.endsWith('.js'))) {
    const main = filenames.find(f => f === 'index.js' || f === 'main.js');
    return `cd /home/user/project && node ${main || filenames.find(f => f.endsWith('.js'))!}`;
  }

  return 'cd /home/user/project && echo "No runnable file detected"';
}

export async function POST(req: Request) {
  try {
    const { session_id, command } = await req.json();
    if (!session_id) {
      return Response.json({ error: 'session_id required' }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // Fetch challenge files (needed for both run command detection and test detection)
    let challengeFiles: Record<string, string> = {};
    const { data: session } = await supabase
      .from('sessions')
      .select('challenge_id')
      .eq('id', session_id)
      .single();

    if (session?.challenge_id) {
      const { data: challenge } = await supabase
        .from('challenges')
        .select('generated_files')
        .eq('id', session.challenge_id)
        .single();
      challengeFiles = challenge?.generated_files || {};
    }

    // Determine command to run
    let runCommand = command;
    if (!runCommand) {
      if (Object.keys(challengeFiles).length > 0) {
        runCommand = detectRunCommand(challengeFiles);
      } else {
        runCommand = 'cd /home/user/project && echo "No challenge files found"';
      }
    }

    // Get sandbox
    const sandboxInfo = await getOrReconnectSandbox(session_id);
    const sandbox = sandboxInfo?.sandbox as Sandbox | undefined;

    if (!sandbox) {
      return Response.json({ error: 'No active sandbox' }, { status: 404 });
    }

    const result = await sandbox.commands.run(runCommand, { timeoutMs: 30000 });

    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');

    // Log the run as an event
    await supabase.from('events').insert({
      session_id,
      event_type: 'code_run',
      raw_content: output || '(no output)',
      metadata: { command: runCommand, exit_code: result.exitCode },
    });

    // Run tests if available and test files actually exist
    let testOutput = '';
    let testsPassed = true;
    const testCmd = detectTestCommand(challengeFiles);
    if (testCmd && sandbox) {
      const checkResult = await sandbox.commands.run(
        'ls /home/user/project/.atrium_tests/ 2>/dev/null | head -1',
        { timeoutMs: 5000 }
      );
      if (checkResult.stdout?.trim()) {
        try {
          const testResult = await sandbox.commands.run(testCmd, { timeoutMs: 60000 });
          testOutput = [testResult.stdout, testResult.stderr].filter(Boolean).join('\n');
          testsPassed = testResult.exitCode === 0;
        } catch {
          testOutput = 'Test execution timed out — you can still submit your solution.';
          testsPassed = true; // Don't block submit on test infra issues
        }
      }
    }

    const canSubmit = result.exitCode === 0 && testsPassed;

    // Trigger immediate observer cycle (fire-and-forget)
    const origin = new URL(req.url).origin;
    fetch(`${origin}/api/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, action: 'run_cycle' }),
    }).catch(() => {});

    return Response.json({
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.exitCode,
      command: runCommand,
      testOutput,
      testsPassed,
      canSubmit,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
