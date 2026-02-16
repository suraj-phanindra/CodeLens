import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractPdfText } from '@/lib/pdf/parser';
import fs from 'fs';
import path from 'path';
import os from 'os';

const anthropic = new Anthropic();

// File-based storage for uploaded buffers (survives across API route workers)
const UPLOAD_DIR = path.join(os.tmpdir(), 'atrium-uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export function storeFileBuffer(fileId: string, buffer: Buffer, filename: string) {
  ensureUploadDir();
  fs.writeFileSync(path.join(UPLOAD_DIR, `${fileId}.bin`), buffer);
  fs.writeFileSync(path.join(UPLOAD_DIR, `${fileId}.meta`), filename);
}

// Keep backward compat alias
export function storePdfBuffer(fileId: string, buffer: Buffer) {
  storeFileBuffer(fileId, buffer, 'unknown.pdf');
}

export function getFileBuffer(fileId: string): { buffer: Buffer; filename: string } | undefined {
  try {
    const bufferPath = path.join(UPLOAD_DIR, `${fileId}.bin`);
    const metaPath = path.join(UPLOAD_DIR, `${fileId}.meta`);
    if (!fs.existsSync(bufferPath)) return undefined;
    const buffer = fs.readFileSync(bufferPath);
    const filename = fs.existsSync(metaPath) ? fs.readFileSync(metaPath, 'utf-8') : 'unknown.pdf';
    return { buffer, filename };
  } catch {
    return undefined;
  }
}

async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'pdf':
      return await extractPdfText(buffer);

    case 'docx': {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    case 'txt':
    case 'md':
      return buffer.toString('utf-8');

    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}

interface ToolCallContext {
  setupId: string;
  challengeId?: string;
  rubricId?: string;
}

export async function handleToolCall(
  name: string,
  input: Record<string, any>,
  context: ToolCallContext
): Promise<string> {
  const supabase = supabaseAdmin();

  switch (name) {
    case 'fetch_sdk_docs': {
      const { url } = input;
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Atrium/1.0' },
          signal: AbortSignal.timeout(15000),
        });
        const html = await response.text();
        // Strip HTML tags, keep text content
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 50000);
        return JSON.stringify({ success: true, content: text, url, chars: text.length });
      } catch (error: any) {
        return JSON.stringify({ success: false, error: error.message });
      }
    }

    case 'parse_uploaded_document':
    case 'parse_uploaded_pdf': {
      const { file_id, document_type } = input;
      const stored = getFileBuffer(file_id);
      if (!stored) {
        return JSON.stringify({ success: false, error: 'File not found. Please re-upload.' });
      }
      try {
        const text = await extractText(stored.buffer, stored.filename);
        return JSON.stringify({
          success: true,
          document_type,
          text: text.substring(0, 30000),
          chars: text.length,
        });
      } catch (error: any) {
        return JSON.stringify({ success: false, error: error.message });
      }
    }

    case 'generate_challenge': {
      const { role_level, tech_stack, focus_areas, scenario_description, difficulty, num_bugs, sdk_docs_content, job_description_text, resume_text } = input;

      // Use a second Opus 4.6 call to generate the actual challenge code
      const generationPrompt = `Generate a realistic buggy codebase for a coding interview challenge.

Role Level: ${role_level}
Tech Stack: ${(tech_stack || []).join(', ')}
Focus Areas: ${(focus_areas || []).join(', ')}
Scenario: ${scenario_description || 'Debug a realistic project'}
Difficulty: ${difficulty || 'medium'}
Number of Bugs: ${num_bugs || 3}

SDK/API Documentation (use this actual SDK):
${(sdk_docs_content || '').substring(0, 15000)}

Job Description:
${(job_description_text || '').substring(0, 5000)}

Candidate Resume:
${(resume_text || '').substring(0, 5000)}

You MUST respond with a single valid JSON object. No markdown fences, no commentary.

CRITICAL FORMAT RULES:
- Keep each file CONCISE: 30-80 lines max per file. Focus on the buggy logic, not boilerplate.
- Generate exactly 3-5 files (not more). Keep it small and focused.
- The "description" field should be a brief README (under 500 chars).
- The "solution_hints" field should be one short paragraph.
- Do NOT include large comments, headers, or license blocks in generated files.
- Do NOT include any comments in the code that hint at, explain, or mark the intentional bugs. The candidate must find bugs through reading and testing, not by reading comments. Bug descriptions belong ONLY in the challenge statement and expected_bugs array, never in the code files.
- Every string value must be properly escaped (newlines as \\n, quotes as \\", no raw line breaks inside JSON strings).

JSON schema:
{
  "title": "string",
  "description": "string (brief README for candidate)",
  "generated_files": { "path/file.ext": "file content as single-line escaped string", ... },
  "expected_bugs": [{ "description": "string", "file": "path", "hint": "string" }],
  "solution_hints": "string",
  "language": "typescript|python"
}

Requirements:
- Use the actual SDK from the docs provided
- Include 2-3 intentional bugs in the focus areas specified
- Bugs should feel like real production issues, not contrived puzzles
- Include a package.json with correct dependencies

Respond with ONLY the JSON object. No wrapping, no explanation.`;

      try {
        const response = await anthropic.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 16000,
          messages: [{ role: 'user', content: generationPrompt }],
        });

        const textBlock = response.content.find(b => b.type === 'text');
        const responseText = textBlock ? textBlock.text : '';
        const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();

        let challenge;
        try {
          challenge = JSON.parse(cleaned);
        } catch (parseError: any) {
          // If JSON is truncated, try to salvage by closing open strings/braces
          const salvaged = cleaned
            .replace(/,\s*$/, '')           // remove trailing comma
            .replace(/"\s*$/, '"')          // close trailing string
            + '}}]}';                       // close any open structures
          try {
            challenge = JSON.parse(salvaged);
          } catch {
            return JSON.stringify({
              success: false,
              error: `Challenge generation produced invalid JSON: ${parseError.message}. Try again with a simpler scenario.`,
            });
          }
        }

        // Store in DB
        const { data, error } = await supabase.from('challenges').insert({
          title: challenge.title,
          description: challenge.description,
          difficulty: difficulty || 'medium',
          sdk_docs_url: null,
          sdk_docs_content: (sdk_docs_content || '').substring(0, 50000),
          job_description_text: job_description_text || null,
          resume_text: resume_text || null,
          generated_files: challenge.generated_files,
          solution_hints: challenge.solution_hints || null,
          expected_bugs: challenge.expected_bugs || [],
          language: challenge.language || 'typescript',
        }).select().single();

        if (error) throw error;

        context.challengeId = data.id;

        return JSON.stringify({
          success: true,
          challenge_id: data.id,
          title: challenge.title,
          description: challenge.description.substring(0, 500),
          file_count: Object.keys(challenge.generated_files).length,
          files: Object.keys(challenge.generated_files),
          bug_count: (challenge.expected_bugs || []).length,
          bugs_preview: (challenge.expected_bugs || []).map((b: any) => b.description),
        });
      } catch (error: any) {
        return JSON.stringify({ success: false, error: error.message });
      }
    }

    case 'set_evaluation_rubric': {
      const { criteria } = input;
      const totalWeight = criteria.reduce((sum: number, c: any) => sum + c.weight, 0);

      if (Math.abs(totalWeight - 100) > 1) {
        return JSON.stringify({
          success: false,
          error: `Weights must sum to 100, got ${totalWeight}`,
        });
      }

      const challengeId = context.challengeId;

      const { data, error } = await supabase.from('rubrics').insert({
        challenge_id: challengeId || null,
        criteria,
        total_weight: totalWeight,
      }).select().single();

      if (error) throw error;

      context.rubricId = data.id;

      return JSON.stringify({
        success: true,
        rubric_id: data.id,
        criteria_count: criteria.length,
        criteria: criteria.map((c: any) => ({ name: c.name, weight: c.weight })),
      });
    }

    case 'create_session': {
      const { challenge_id, rubric_id, candidate_name, duration_minutes } = input;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      // Create session in DB
      const { data: session, error } = await supabase.from('sessions').insert({
        interviewer_id: context.setupId,
        candidate_name: candidate_name || null,
        challenge_id: challenge_id || context.challengeId,
        rubric_id: rubric_id || context.rubricId,
        status: 'pending',
        duration_minutes: duration_minutes || 45,
      }).select().single();

      if (error) throw error;

      const candidateUrl = `${appUrl}/interview/${session.id}/candidate`;
      const dashboardUrl = `${appUrl}/interview/${session.id}/dashboard`;

      return JSON.stringify({
        success: true,
        session_id: session.id,
        candidate_url: candidateUrl,
        dashboard_url: dashboardUrl,
        status: 'pending',
        message: 'Session created! Share the candidate link. Open the dashboard to monitor.',
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
