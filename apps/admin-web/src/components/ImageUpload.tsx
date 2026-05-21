import { useRef, useState, useEffect } from 'react';
import { Upload, Link, Check } from 'lucide-react';
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

  useEffect(() => {
    setPreview(currentUrl ?? null);
  }, [currentUrl]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const { uploadFile } = useR2Upload();

  async function handleUrlSave() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      setUploading(true);
      setError(null);
      const field = type === 'cover' ? 'coverImage' : 'bannerImage';
      await api.patch(`/admin/games/${gameId}/media`, {
        [field]: { key: trimmed, url: trimmed },
      });
      setUrlInput('');
      onSuccess?.(trimmed);
    } catch {
      setError('Lưu URL thất bại');
    } finally {
      setUploading(false);
    }
  }

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
      await uploadFile(presigned.uploadUrl, file);

      // Update game media metadata
      await api.patch(`/admin/games/${gameId}/media`, {
        [type === 'cover' ? 'coverImage' : 'bannerImage']: {
          key: presigned.key,
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
      <div className="flex items-center justify-between mb-1">
        <label className="label">{label}</label>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              mode === 'file'
                ? 'bg-primary text-white'
                : 'bg-bg-elevated text-text-muted hover:text-text-primary'
            }`}
          >
            <Upload size={11} /> File
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              mode === 'url'
                ? 'bg-primary text-white'
                : 'bg-bg-elevated text-text-muted hover:text-text-primary'
            }`}
          >
            <Link size={11} /> URL
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {mode === 'url' ? (
        <div className="flex gap-2 mb-2">
          <input
            className="input flex-1 text-sm"
            placeholder="https://..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlSave())}
          />
          <button
            type="button"
            onClick={handleUrlSave}
            disabled={uploading || !urlInput.trim()}
            className="btn-primary px-3 text-sm flex items-center gap-1 disabled:opacity-50"
          >
            <Check size={14} /> Lưu
          </button>
        </div>
      ) : null}

      <div
        className={`${aspectRatio} bg-bg-elevated rounded-lg border-2 border-dashed border-border ${mode === 'file' ? 'hover:border-primary/50 cursor-pointer' : ''} transition-colors overflow-hidden flex items-center justify-center relative group`}
        onClick={() => mode === 'file' && fileInputRef.current?.click()}
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
            <p className="text-text-secondary text-sm">
              {mode === 'file' ? `Click to upload ${label.toLowerCase()}` : preview ? 'Preview' : 'Nhập URL bên trên để xem preview'}
            </p>
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
