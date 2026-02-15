import type Anthropic from '@anthropic-ai/sdk';

export const ARCHITECT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'fetch_sdk_docs',
    description: 'Fetch SDK or API documentation from a URL to use as the basis for generating the coding challenge. Returns the extracted text content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'URL to the SDK docs, API reference, or GitHub README' },
        max_pages: { type: 'integer', description: 'Max number of linked pages to also fetch (for multi-page docs)', default: 3 }
      },
      required: ['url']
    }
  },
  {
    name: 'parse_uploaded_document',
    description: 'Extract text from an uploaded document. Supports PDF, DOCX, TXT, and MD files. Use for job descriptions, resumes, and other documents.',
    input_schema: {
      type: 'object' as const,
      properties: {
        file_id: { type: 'string', description: 'The uploaded file ID' },
        document_type: { type: 'string', enum: ['job_description', 'resume', 'document'], description: 'Type of document' }
      },
      required: ['file_id', 'document_type']
    }
  },
  {
    name: 'generate_challenge',
    description: 'Generate a coding challenge with a realistic buggy codebase based on the SDK docs, job description, and interview requirements.',
    input_schema: {
      type: 'object' as const,
      properties: {
        role_level: { type: 'string', enum: ['junior', 'mid', 'senior', 'staff'] },
        tech_stack: { type: 'array', items: { type: 'string' } },
        focus_areas: { type: 'array', items: { type: 'string' } },
        scenario_description: { type: 'string' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        num_bugs: { type: 'integer', minimum: 1, maximum: 5 },
        sdk_docs_content: { type: 'string' },
        job_description_text: { type: 'string' },
        resume_text: { type: 'string' }
      },
      required: ['role_level', 'focus_areas', 'sdk_docs_content']
    }
  },
  {
    name: 'set_evaluation_rubric',
    description: 'Create a custom evaluation rubric with weighted criteria based on the interview requirements. This rubric will guide the live analysis and scoring.',
    input_schema: {
      type: 'object' as const,
      properties: {
        criteria: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              weight: { type: 'number', description: 'Percentage weight, all must sum to 100' },
              description: { type: 'string' },
              positive_signals: { type: 'array', items: { type: 'string' } },
              negative_signals: { type: 'array', items: { type: 'string' } }
            },
            required: ['name', 'weight', 'description', 'positive_signals', 'negative_signals']
          }
        }
      },
      required: ['criteria']
    }
  },
  {
    name: 'create_session',
    description: 'Create the interview session. Spins up the E2B sandbox with the challenge code and Claude Code. Returns the candidate link and dashboard link.',
    input_schema: {
      type: 'object' as const,
      properties: {
        challenge_id: { type: 'string' },
        rubric_id: { type: 'string' },
        candidate_name: { type: 'string' },
        duration_minutes: { type: 'integer', default: 45 }
      },
      required: ['challenge_id', 'rubric_id']
    }
  }
];
