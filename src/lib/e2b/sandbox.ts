import { Sandbox } from 'e2b';

export async function createInterviewSandbox(
  challengeFiles: Record<string, string>,
  challengeReadme: string
): Promise<{ sandboxId: string; sandbox: Sandbox }> {
  const sandbox = await Sandbox.create('base', {
    envs: { ANTHROPIC_API_KEY: process.env.CANDIDATE_ANTHROPIC_KEY! },
    timeoutMs: 60 * 60 * 1000,
  });

  // Install Claude Code
  await sandbox.commands.run('npm install -g @anthropic-ai/claude-code', { timeoutMs: 120000 });

  // Create project directory and write challenge files
  await sandbox.commands.run('mkdir -p /home/user/project');
  for (const [path, content] of Object.entries(challengeFiles)) {
    const dir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
    if (dir) {
      await sandbox.commands.run(`mkdir -p /home/user/project/${dir}`);
    }
    await sandbox.files.write(`/home/user/project/${path}`, content);
  }
  await sandbox.files.write('/home/user/project/README.md', challengeReadme);

  // Install dependencies
  if (challengeFiles['package.json']) {
    await sandbox.commands.run('cd /home/user/project && npm install', { timeoutMs: 120000 });
  }
  if (challengeFiles['requirements.txt']) {
    await sandbox.commands.run('cd /home/user/project && pip install -r requirements.txt', { timeoutMs: 120000 });
  }
  // Ensure test runner is available
  const hasPython = Object.keys(challengeFiles).some(f => f.endsWith('.py'));
  if (hasPython) {
    await sandbox.commands.run('pip install pytest 2>/dev/null', { timeoutMs: 30000 });
  }

  // Move test files to hidden directory so candidate can't see them
  await sandbox.commands.run(
    'mkdir -p /home/user/project/.atrium_tests && ' +
    'cd /home/user/project && ' +
    'for f in test_* *_test.* *.test.* *.spec.* conftest.py pytest.ini jest.config*; do ' +
    '  [ -e "$f" ] && mv "$f" .atrium_tests/; ' +
    'done; ' +
    '[ -d tests ] && mv tests .atrium_tests/tests; ' +
    '[ -d __tests__ ] && mv __tests__ .atrium_tests/__tests__; true'
  );

  return { sandboxId: sandbox.sandboxId, sandbox };
}
