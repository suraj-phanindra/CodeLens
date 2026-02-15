'use client';

import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  json: 'json', md: 'markdown', py: 'python', rs: 'rust', go: 'go',
  html: 'html', css: 'css', scss: 'scss', yaml: 'yaml', yml: 'yaml',
  toml: 'toml', sql: 'sql', sh: 'shell', bash: 'shell', xml: 'xml',
  svg: 'xml', graphql: 'graphql', prisma: 'prisma', env: 'ini',
};

function getLang(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANG[ext] || 'plaintext';
}

interface CodeEditorProps {
  path: string;
  content: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ path, content, onChange, readOnly }: CodeEditorProps) {
  return (
    <MonacoEditor
      language={getLang(path)}
      theme="vs-dark"
      value={content}
      onChange={(v) => onChange(v ?? '')}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        lineNumbersMinChars: 3,
        padding: { top: 8 },
        renderLineHighlight: 'line',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        automaticLayout: true,
      }}
    />
  );
}
