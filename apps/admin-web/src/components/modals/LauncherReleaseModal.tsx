import { useState, useRef, FormEvent } from 'react';
import { useR2Upload } from '../../lib/useR2Upload';
import { computeFileSHA256 } from '../../lib/crypto';
import { api } from '../../lib/api';
import { X, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

interface LauncherReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LauncherReleaseModal({
  isOpen,
  onClose,
  onSuccess,
}: LauncherReleaseModalProps) {
  const [step, setStep] = useState<'details' | 'upload' | 'success' | 'error'>('details');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    version: '',
    platform: 'win32' as 'win32' | 'darwin' | 'linux',
    releaseNotes: '',
    minSupportedVersion: '',
  });

  const [files, setFiles] = useState<File[]>([]);
  const { uploadFiles, uploadProgress, isUploading, error: uploadError } = useR2Upload();
  const [error, setError] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
    setFiles(selected);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!files.length) {
      setError('Please select at least one artifact file');
      return;
    }

    try {
      setStep('upload');

      // Create launcher release in draft state
      const release = await api
        .post('/admin/launcher/releases', {
          version: form.version,
          platform: form.platform,
          releaseNotes: form.releaseNotes,
          minSupportedVersion: form.minSupportedVersion,
        })
        .then((r) => r.data);

      // Get presigned URLs for artifact files
      const presignedUrls = await api
        .post(`/admin/launcher/releases/${release._id}/presign-artifacts`, {
          artifacts: files.map((f) => ({
            filename: f.name,
            contentType: f.type || 'application/octet-stream',
          })),
        })
        .then((r) => r.data);

      // Upload files
      const urlsByName = new Map<string, string>(
        presignedUrls.map((u: { filename: string; url: string }) => [u.filename, u.url]),
      );

      await uploadFiles(
        files.map((f) => ({
          file: f,
          relativePath: f.name,
          sha256: '', // Not needed for launcher artifacts
          uploaded: false,
          progress: 0,
        })),
        async (fileToUpload): Promise<string> => {
          const url = urlsByName.get(fileToUpload.relativePath);
          if (!url) throw new Error(`No presigned URL for ${fileToUpload.relativePath}`);
          return url;
        },
      );

      // Publish release
      await api.post(`/admin/launcher/releases/${release._id}/publish`);

      setStep('success');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('error');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-base rounded-lg max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-bg-base border-b border-border p-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">New Launcher Release</h2>
          <button
            className="p-1 rounded hover:bg-bg-overlay text-text-muted hover:text-text-primary"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* DETAILS: Enter release info */}
          {step === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Version *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="1.0.0"
                  value={form.version}
                  onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">Platform *</label>
                <select
                  className="input"
                  value={form.platform}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      platform: e.target.value as 'win32' | 'darwin' | 'linux',
                    }))
                  }
                >
                  <option value="win32">Windows</option>
                  <option value="darwin">macOS</option>
                  <option value="linux">Linux</option>
                </select>
              </div>

              <div>
                <label className="label">Min Supported Version</label>
                <input
                  type="text"
                  className="input"
                  placeholder="0.9.0 (optional)"
                  value={form.minSupportedVersion}
                  onChange={(e) => setForm((f) => ({ ...f, minSupportedVersion: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Release Notes</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="What's new in this release?"
                  value={form.releaseNotes}
                  onChange={(e) => setForm((f) => ({ ...f, releaseNotes: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Artifact Files *</label>
                <div
                  className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".exe,.dmg,.yml,.zip,.AppImage"
                  />
                  <Upload size={20} className="mx-auto text-primary mb-2" />
                  <p className="text-text-secondary text-sm">
                    {files.length > 0 ? (
                      <span>
                        {files.length} file(s) selected
                        <br />
                        <span className="text-text-muted text-xs">
                          ({(files.reduce((sum, f) => sum + f.size, 0) / 1_048_576).toFixed(1)} MB)
                        </span>
                      </span>
                    ) : (
                      'Click to select files'
                    )}
                  </p>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Upload latest.yml, setup exe/dmg, and blockmap files
                </p>
              </div>

              {error && (
                <p className="text-sm text-primary bg-primary-muted/20 border border-primary/20 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!files.length}>
                  Upload & Publish
                </button>
              </div>
            </form>
          )}

          {/* UPLOAD: Show progress */}
          {step === 'upload' && (
            <div className="space-y-4">
              {files.map((f) => (
                <div key={f.name} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-secondary">{f.name}</span>
                    <span className="text-text-muted">{uploadProgress.get(f.name) ?? 0}%</span>
                  </div>
                  <div className="w-full bg-bg-overlay rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress.get(f.name) ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
              <h3 className="text-lg font-semibold text-text-primary">Published Successfully!</h3>
              <p className="text-text-muted text-sm mt-1">Launcher release is now available.</p>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="text-center py-8">
              <AlertCircle size={48} className="mx-auto text-primary mb-3" />
              <h3 className="text-lg font-semibold text-primary">Upload Failed</h3>
              <p className="text-text-muted text-sm mt-1">{uploadError || error}</p>
              <button
                onClick={() => {
                  setStep('details');
                  setError(null);
                }}
                className="btn-primary mt-4"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
