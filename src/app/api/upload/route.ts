import { storeFileBuffer } from '@/lib/agents/architect';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return Response.json(
        { error: `Unsupported file type. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = crypto.randomUUID();

    // Store buffer in memory for later extraction
    storeFileBuffer(fileId, buffer, file.name);

    return Response.json({
      file_id: fileId,
      name: file.name,
      size: file.size,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
