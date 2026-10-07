import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { uploadUrlRequestSchema } from '@/schemas';
import { errorMessage } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import { uploadService } from '@/services/upload.service';
import { buttonClasses } from '../common/buttonClasses';
import { Spinner } from '../common/Spinner';

interface ImageUploadButtonProps {
  onUploaded: (image: { url: string; key: string }) => void;
}

export function ImageUploadButton({ onUploaded }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const toast = useToast();

  const upload = async (file: File) => {
    const request = uploadUrlRequestSchema.safeParse({
      contentType: file.type,
      contentLength: file.size,
    });
    if (!request.success) {
      toast.error('Can’t use that file', request.error.issues[0]?.message);
      return;
    }
    setProgress(0);
    try {
      const target = await uploadService.requestVehicleImageUrl(request.data);
      await uploadService.putToS3(target, file, setProgress);
      onUploaded({ url: target.publicUrl, key: target.key });
    } catch (error) {
      toast.error(
        'Upload failed',
        error instanceof Error && !('code' in error) ? error.message : errorMessage(error),
      );
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const busy = progress !== null;
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <button
        type="button"
        className={buttonClasses('secondary', 'md', 'shrink-0')}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-busy={busy || undefined}
      >
        {busy ? <Spinner className="size-4" /> : <Upload className="size-4" />}
        {busy ? `Uploading ${Math.round(progress * 100)}%` : 'Upload photo'}
      </button>
    </>
  );
}
