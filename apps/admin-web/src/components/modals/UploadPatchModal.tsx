import { useState, useRef, FormEvent } from 'react';
import { useR2Upload, FileToUpload } from '../../lib/useR2Upload';
import { computeFileSHA256 } from '../../lib/crypto';
import { api } from '../../lib/api';
import { X, Upload, CheckCircle2, AlertCircle, FolderOpen } from 'lucide-react';

interface UploadPatchModalProps {
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface UploadSession {
  sessionId: string;
  uploadedFiles: number;
  totalFiles: number;
}

type UploadStep = 'initial' | 'metadata' | 'uploading' | 'success' | 'error';

export default function UploadPatchModal({
  gameId,
  isOpen,
  onClose,
  onSuccess,
}: UploadPatchModalProps) {
  const [step, setStep] = useState<UploadStep>('initial');
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [uploadSession, setUploadSession] = useState<UploadSession | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [metadata, setMetadata] = useState({
    version: '',
    title: '',
    changelog: '',
    mode: 'NEW_VERSION' as 'NEW_VERSION' | 'REPLACE_EXISTING',
  });

  const { uploadFiles, uploadProgress, isUploading, error: uploadError } = useR2Upload();

  async function handleFolderSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
    if (selectedFiles.length === 0) return;

    // Compute SHA-256 for each file
    const filesWithHash: FileToUpload[] = await Promise.all(
      selectedFiles.map(async (file) => ({
        file,
        relativePath: file.webkitRelativePath || file.name,
        sha256: await computeFileSHA256(file),
        uploaded: false,
        progress: 0,
      })),
    );

    setFiles(filesWithHash);
    setStep('metadata');
  }

  async function handleMetadataSubmit(e: FormEvent) {
    e.preventDefault();

    try {
      // Step 1: Create patch version
      const patch = await api
        .post(`/admin/games/${gameId}/patches`, {
          version: metadata.version,
          title: metadata.title,
          changelog: metadata.changelog || undefined,
          mode: metadata.mode,
        })
        .then((r) => r.data);

      const patchVersionId: string = patch._id;

      setUploadSession({
        sessionId: patchVersionId,
        uploadedFiles: 0,
        totalFiles: files.length,
      });

      // Step 2: Presign all files
      const presignedList: Array<{ relativePath: string; uploadUrl: string; r2Key: string }> =
        await api
          .post(`/admin/patches/${patchVersionId}/presign-files`, {
            files: files.map((f) => ({
              relativePath: f.relativePath,
              sha256: f.sha256,
              size: f.file.size,
              contentType: f.file.type || 'application/octet-stream',
            })),
          })
          .then((r) => r.data);

      setStep('uploading');

      // Step 3: Upload all files to R2
      const urlsByPath = new Map<string, { uploadUrl: string; r2Key: string }>(
        presignedList.map((u) => [u.relativePath, { uploadUrl: u.uploadUrl, r2Key: u.r2Key }]),
      );

      await uploadFiles(files, async (file): Promise<string> => {
        const entry = urlsByPath.get(file.relativePath);
        if (!entry) throw new Error(`No presigned URL for ${file.relativePath}`);
        return entry.uploadUrl;
      });

      // Step 4: Complete upload
      await api.post(`/admin/patches/${patchVersionId}/complete-upload`, {
        files: files.map((f) => {
          const entry = urlsByPath.get(f.relativePath)!;
          return {
            relativePath: f.relativePath,
            r2Key: entry.r2Key,
            size: f.file.size,
            sha256: f.sha256,
            contentType: f.file.type || 'application/octet-stream',
          };
        }),
      });

      setStep('success');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Upload failed:', err);
      setStep('error');
    }
  }

  if (!isOpen) return null;

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
  const uploadedCount = files.filter((f) => f.uploaded).length;
  const overallProgress = files.length > 0 ? Math.round((uploadedCount / files.length) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-base rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-bg-base border-b border-border p-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Upload Patch Files</h2>
          <button
            className="p-1 rounded hover:bg-bg-overlay text-text-muted hover:text-text-primary"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* INITIAL: Select folder */}
          {step === 'initial' && (
            <div className="space-y-4">
              <p className="text-text-secondary text-sm">
                Select a folder containing your patch files. All files and directory structure will be preserved.
              </p>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFolderSelect}
                  className="hidden"
                  {...({ webkitdirectory: "true" } as any)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex flex-col items-center gap-2 text-text-muted hover:text-text-primary"
                >
                  <FolderOpen size={32} className="text-primary" />
                  <span className="font-medium">Click to select folder</span>
                  <span className="text-xs text-text-muted">or drag folder here</span>
                </button>
              </div>
              <div className="text-xs text-text-muted bg-bg-elevated p-3 rounded">
                <p>✓ Files can be in nested folders</p>
                <p>✓ File structure will be preserved on R2</p>
              </div>
            </div>
          )}

          {/* METADATA: Edit patch details */}
          {step === 'metadata' && (
            <form onSubmit={handleMetadataSubmit} className="space-y-4">
              <div className="bg-bg-elevated p-4 rounded">
                <p className="text-sm font-medium text-text-secondary">
                  Selected {files.length} file(s) ({(totalSize / 1_048_576).toFixed(1)} MB)
                </p>
                <div className="text-xs text-text-muted mt-2 space-y-1 max-h-32 overflow-auto">
                  {files.slice(0, 5).map((f) => (
                    <div key={f.relativePath}>• {f.relativePath}</div>
                  ))}
                  {files.length > 5 && <div>• ... and {files.length - 5} more files</div>}
                </div>
              </div>

              <div>
                <label className="label">Version *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="1.0.0"
                  value={metadata.version}
                  onChange={(e) => setMetadata((m) => ({ ...m, version: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Vietnamese Patch v1.0.0"
                  value={metadata.title}
                  onChange={(e) => setMetadata((m) => ({ ...m, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">Changelog</label>
                <textarea
                  className="input resize-none"
                  placeholder="- Fixed translations&#10;- Updated UI assets"
                  rows={3}
                  value={metadata.changelog}
                  onChange={(e) => setMetadata((m) => ({ ...m, changelog: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Mode *</label>
                <select
                  className="input"
                  value={metadata.mode}
                  onChange={(e) =>
                    setMetadata((m) => ({
                      ...m,
                      mode: e.target.value as 'NEW_VERSION' | 'REPLACE_EXISTING',
                    }))
                  }
                >
                  <option value="NEW_VERSION">New Version (new patch)</option>
                  <option value="REPLACE_EXISTING">Replace Existing (overwrite latest)</option>
                </select>
                <p className="text-xs text-text-muted mt-1">
                  {metadata.mode === 'NEW_VERSION'
                    ? 'Creates a new patch version'
                    : 'Replaces the latest patch version'}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setStep('initial');
                  }}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button type="submit" className="btn-primary">
                  Start Upload
                </button>
              </div>
            </form>
          )}

          {/* UPLOADING: Show progress */}
          {step === 'uploading' && (
            <div className="space-y-4">
              <div className="bg-bg-elevated p-4 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-secondary">
                    Overall progress
                  </span>
                  <span className="text-sm text-text-muted">{overallProgress}%</span>
                </div>
                <div className="w-full bg-bg-base rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-200"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-40 overflow-auto">
                {files.map((f) => (
                  <div key={f.relativePath} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-text-secondary truncate">{f.relativePath}</span>
                      <span className="text-text-muted">{uploadProgress.get(f.file.name) ?? 0}%</span>
                    </div>
                    <div className="w-full bg-bg-overlay rounded-full h-1">
                      <div
                        className="bg-primary h-1 rounded-full transition-all"
                        style={{ width: `${uploadProgress.get(f.file.name) ?? 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
              <h3 className="text-lg font-semibold text-text-primary">Upload Successful!</h3>
              <p className="text-text-muted text-sm mt-1">
                Your patch is being processed. Redirecting...
              </p>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="text-center py-8">
              <AlertCircle size={48} className="mx-auto text-primary mb-3" />
              <h3 className="text-lg font-semibold text-primary">Upload Failed</h3>
              <p className="text-text-muted text-sm mt-1">{uploadError}</p>
              <button
                onClick={() => {
                  setStep('metadata');
                }}
                className="btn-primary mt-4"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
