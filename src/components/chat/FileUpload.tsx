'use client';

import { useCallback, useRef, useState } from 'react';
import { Paperclip, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];
const ACCEPT_STRING = '.pdf,.docx,.txt,.md';

function getDocumentType(filename: string): 'job_description' | 'resume' | 'document' {
  const lower = filename.toLowerCase();
  if (lower.includes('jd') || lower.includes('job') || lower.includes('description') || lower.includes('role')) {
    return 'job_description';
  }
  if (lower.includes('resume') || lower.includes('cv') || lower.includes('candidate')) {
    return 'resume';
  }
  return 'document';
}

interface FileUploadProps {
  onFileUploaded: (file: { id: string; name: string; type: string; size: number }) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

export function FileUpload({ onFileUploaded, onUploadingChange }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const activeUploads = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return;
    }

    activeUploads.current += 1;
    setIsUploading(true);
    onUploadingChange?.(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const docType = getDocumentType(file.name);
      onFileUploaded({
        id: data.file_id,
        name: file.name,
        type: docType,
        size: file.size,
      });
    } catch (err: any) {
      console.error('Upload failed:', err.message);
    } finally {
      activeUploads.current -= 1;
      if (activeUploads.current === 0) {
        setIsUploading(false);
        onUploadingChange?.(false);
      }
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onFileUploaded, onUploadingChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    // Upload all selected files
    Array.from(files).forEach(file => handleUpload(file));
  }, [handleUpload]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className={cn(
          'p-2 rounded-lg transition-colors',
          isUploading
            ? 'text-[#3b82f6]'
            : 'text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#18181b]'
        )}
        title="Upload files (.pdf, .docx, .txt, .md)"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Paperclip className="w-4 h-4" />
        )}
      </button>
    </>
  );
}
