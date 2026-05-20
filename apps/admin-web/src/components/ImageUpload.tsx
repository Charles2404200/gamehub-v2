import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useR2Upload } from '../lib/useR2Upload';
import { api } from '../lib/api';

interface ImageUploadProps {
  gameId: string;
  type: 'cover' | 'banner';
  currentUrl?: string;
  onSuccess?: (url: string) => void;
}

export default function ImageUpload({
  gameId,
  type,
  currentUrl,
  onSuccess,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { uploadFile } = useR2Upload();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setUploading(true);
      setError(null);

      // Get presigned URL
      const presigned = await api
        .post(`/admin/games/${gameId}/${type}/presign`, {
          contentType: file.type,
        })
        .then((r) => r.data);

      // Upload to R2
      await uploadFile(presigned.url, file);

      // Update game media metadata
      await api.patch(`/admin/games/${gameId}/media`, {
        [type === 'cover' ? 'coverImage' : 'bannerImage']: {
          key: presigned.key,
          url: presigned.url,
        },
      });

      onSuccess?.(presigned.url);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const label = type === 'cover' ? 'Cover Image' : 'Banner Image';
  const aspectRatio = type === 'cover' ? 'aspect-[3/4]' : 'aspect-[16/9]';

  return (
    <div>
      <label className="label">{label}</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        className={`${aspectRatio} bg-bg-elevated rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer overflow-hidden flex items-center justify-center relative group`}
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={label}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Upload size={20} className="text-white" />
              <span className="text-white text-sm">Replace Image</span>
            </div>
          </>
        ) : (
          <div className="text-center pointer-events-none">
            <Upload size={24} className="mx-auto text-text-muted mb-2" />
            <p className="text-text-secondary text-sm">Click to upload {label.toLowerCase()}</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-primary mt-2">{error}</p>
      )}

      {uploading && (
        <p className="text-xs text-text-muted mt-2">Uploading...</p>
      )}
    </div>
  );
}
