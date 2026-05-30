import { useState, useRef, FormEvent } from 'react';
import { useR2Upload, FileToUpload } from '../../lib/useR2Upload';
import { computeFileSHA256 } from '../../lib/crypto';
import { api } from '../../lib/api';
import { X, Upload, CheckCircle2, AlertCircle, FolderOpen, FileUp, Trash2 } from 'lucide-react';

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
  const [isHashing, setIsHashing] = useState(false);
  const [hashProgress, setHashProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploadSession, setUploadSession] = useState<UploadSession | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [metadata, setMetadata] = useState({
    version: '',
    title: '',
    changelog: '',
    mode: 'NEW_VERSION' as 'NEW_VERSION' | 'REPLACE_EXISTING',
  });

  const { uploadFiles, uploadProgress, isUploading, error: uploadError } = useR2Upload();

  /** Recursively read a FileSystemEntry into { file, relativePath } pairs */
  async function readEntry(
    entry: FileSystemEntry,
    parentPath = '',
  ): Promise<{ file: File; relativePath: string }[]> {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((res) => fileEntry.file(res));
      const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      return [{ file, relativePath }];
    } else {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      const dirPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      // readEntries may batch — call until empty
      const allEntries: FileSystemEntry[] = [];
      await new Promise<void>((res) => {
        const read = () =>
          reader.readEntries((batch) => {
            if (batch.length === 0) { res(); return; }
            allEntries.push(...batch);
            read();
          });
        read();
      });
      const nested = await Promise.all(allEntries.map((e) => readEntry(e, dirPath)));
      return nested.flat();
    }
  }

  async function addRawFiles(pairs: { file: File; relativePath: string }[]) {
    if (pairs.length === 0) return;

    const existing = new Set(files.map((f) => f.relativePath));
    const seenIncoming = new Set<string>();
    const uniqueIncoming = pairs.filter((p) => {
      if (existing.has(p.relativePath) || seenIncoming.has(p.relativePath)) return false;
      seenIncoming.add(p.relativePath);
      return true;
    });
    if (uniqueIncoming.length === 0) return;

    const HASH_CONCURRENCY = Math.max(
      1,
      Math.min(4, Math.floor((navigator.hardwareConcurrency || 4) / 2)),
    );

    setErrorMessage(null);
    setIsHashing(true);
    setHashProgress({ done: 0, total: uniqueIncoming.length });

    try {
      const hashed: FileToUpload[] = new Array(uniqueIncoming.length);
      let nextIndex = 0;
      let completed = 0;

      const worker = async () => {
        while (true) {
          const index = nextIndex++;
          if (index >= uniqueIncoming.length) return;

          const { file, relativePath } = uniqueIncoming[index];
          const sha256 = await computeFileSHA256(file);
          hashed[index] = {
            file,
            relativePath,
            sha256,
            uploaded: false,
            progress: 0,
          };

          completed += 1;
          setHashProgress({ done: completed, total: uniqueIncoming.length });

          // Yield occasionally to keep the modal responsive for large file sets.
          if (completed % 8 === 0) {
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(HASH_CONCURRENCY, uniqueIncoming.length) }, () => worker()),
      );

      setFiles((prev) => [...prev, ...hashed]);
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Không thể tính SHA-256 cho danh sách file');
    } finally {
      setIsHashing(false);
      setHashProgress(null);
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();

    const items = Array.from(e.dataTransfer.items ?? []);
    const entries = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.webkitGetAsEntry())
      .filter(Boolean) as FileSystemEntry[];

    let pairs: Array<{ file: File; relativePath: string }> = [];

    if (entries.length > 0) {
      const settled = await Promise.allSettled(entries.map((entry) => readEntry(entry)));
      pairs = settled
        .filter((r): r is PromiseFulfilledResult<Array<{ file: File; relativePath: string }>> =>
          r.status === 'fulfilled',
        )
        .flatMap((r) => r.value);
    }

    // Fallback for environments where webkitGetAsEntry is unavailable for bulk drops.
    if (pairs.length === 0) {
      const droppedFiles = Array.from(e.dataTransfer.files ?? []);
      pairs = droppedFiles.map((file) => ({
        file,
        relativePath: file.webkitRelativePath || file.name,
      }));
    }

    if (pairs.length === 0) {
      setErrorMessage('Không đọc được file từ thao tác kéo thả. Hãy thử nút Chọn thư mục hoặc Chọn file lẻ.');
      return;
    }

    await addRawFiles(pairs);
  }

  async function handleFolderSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
    e.currentTarget.value = '';
    await addRawFiles(selected.map((f) => ({ file: f, relativePath: f.webkitRelativePath || f.name })));
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
    e.currentTarget.value = '';
    await addRawFiles(selected.map((f) => ({ file: f, relativePath: f.name })));
  }

  function removeFile(relativePath: string) {
    setFiles((prev) => prev.filter((f) => f.relativePath !== relativePath));
  }

  async function handleMetadataSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    try {
      // Step 1: Create patch version
      let patch: { _id: string };
      try {
        patch = await api
          .post(`/admin/games/${gameId}/patches`, {
            version: metadata.version,
            title: metadata.title,
            changelog: metadata.changelog || undefined,
            mode: metadata.mode,
          })
          .then((r) => r.data);
      } catch (err: any) {
        if (err?.response?.status === 409) {
          setErrorMessage(
            `Phiên bản "${metadata.version}" đã tồn tại. Hãy đổi tên phiên bản hoặc chọn mode "Replace Existing".`,
          );
          setStep('error');
          return;
        }
        throw err;
      }

      const patchVersionId: string = patch._id;

      setUploadSession({
        sessionId: patchVersionId,
        uploadedFiles: 0,
        totalFiles: files.length,
      });

      setStep('uploading');

      // Step 2 & 3: Presign + upload in chunks so uploads start immediately.
      const BATCH = 250;
      const uploadedEntries: Array<{ relativePath: string; r2Key: string }> = [];

      for (let i = 0; i < files.length; i += BATCH) {
        const chunk = files.slice(i, i + BATCH);
        const presignedList: Array<{ relativePath: string; uploadUrl: string; r2Key: string }> =
          await api
            .post(`/admin/patches/${patchVersionId}/presign-files`, {
              files: chunk.map((f) => ({
                relativePath: f.relativePath,
                sha256: f.sha256,
                size: f.file.size,
                contentType: f.file.type || 'application/octet-stream',
              })),
            })
            .then((r) => r.data);

        const urlsByPath = new Map<string, { uploadUrl: string; r2Key: string }>(
          presignedList.map((u) => [u.relativePath, { uploadUrl: u.uploadUrl, r2Key: u.r2Key }]),
        );

        await uploadFiles(chunk, async (file): Promise<string> => {
          const entry = urlsByPath.get(file.relativePath);
          if (!entry) throw new Error(`No presigned URL for ${file.relativePath}`);
          return entry.uploadUrl;
        });

        for (const f of chunk) {
          const entry = urlsByPath.get(f.relativePath);
          if (!entry) throw new Error(`No uploaded r2Key for ${f.relativePath}`);
          uploadedEntries.push({ relativePath: f.relativePath, r2Key: entry.r2Key });
        }
      }

      const uploadedKeyByPath = new Map(uploadedEntries.map((e) => [e.relativePath, e.r2Key]));

      // Step 4: Complete upload — single call
      await api.post(`/admin/patches/${patchVersionId}/complete-upload`, {
        files: files.map((f) => {
          const r2Key = uploadedKeyByPath.get(f.relativePath);
          if (!r2Key) throw new Error(`Missing uploaded key for ${f.relativePath}`);
          return {
            relativePath: f.relativePath,
            r2Key,
            size: f.file.size,
            sha256: f.sha256,
            contentType: f.file.type || 'application/octet-stream',
          };
        }),
      });

      // Step 5: Publish — builds manifest & updates game.latestPatchVersionId
      await api.post(`/admin/patches/${patchVersionId}/publish`);

      setStep('success');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Lỗi không xác định');
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
          {/* INITIAL: Select folder and/or individual files */}
          {step === 'initial' && (
            <div className="space-y-4">
              {/* Hidden inputs */}
              <input ref={folderInputRef} type="file" multiple onChange={handleFolderSelect} className="hidden" {...({ webkitdirectory: 'true' } as any)} />
              <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

              {/* Drag & drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center
                           hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Upload size={32} className="text-primary mx-auto mb-3" />
                <p className="text-sm font-medium text-text-primary mb-1">
                  Kéo thả file và thư mục vào đây
                </p>
                <p className="text-xs text-text-muted mb-4">
                  Có thể kéo cùng lúc nhiều folder và file lẻ
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={isHashing}
                    className="inline-flex items-center gap-1.5 text-xs border border-border rounded-lg
                               px-3 py-1.5 hover:bg-bg-elevated transition-colors disabled:opacity-50"
                  >
                    <FolderOpen size={13} className="text-primary" /> Chọn thư mục
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isHashing}
                    className="inline-flex items-center gap-1.5 text-xs border border-border rounded-lg
                               px-3 py-1.5 hover:bg-bg-elevated transition-colors disabled:opacity-50"
                  >
                    <FileUp size={13} className="text-primary" /> Chọn file lẻ
                  </button>
                </div>
              </div>

              {/* File list */}
              {isHashing && (
                <p className="text-xs text-text-muted text-center animate-pulse">
                  Đang tính SHA-256… {hashProgress ? `(${hashProgress.done}/${hashProgress.total})` : ''}
                </p>
              )}
              {files.length > 0 && (
                <div className="bg-bg-elevated rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-xs font-medium text-text-secondary">
                      {files.length} file · {(totalSize / 1_048_576).toFixed(1)} MB
                    </span>
                    <button
                      onClick={() => setFiles([])}
                      className="text-xs text-text-muted hover:text-red-400 transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="max-h-40 overflow-auto divide-y divide-border">
                    {files.map((f) => (
                      <div key={f.relativePath} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-text-secondary truncate flex-1 mr-2">{f.relativePath}</span>
                        <span className="text-text-muted shrink-0 mr-2">
                          {(f.file.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          onClick={() => removeFile(f.relativePath)}
                          className="text-text-muted hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {files.length > 0 && !isHashing && (
                <button
                  type="button"
                  onClick={() => setStep('metadata')}
                  className="btn-primary w-full"
                >
                  Tiếp tục ({files.length} file)
                </button>
              )}

              {files.length === 0 && !isHashing && (
                <p className="text-xs text-text-muted text-center">
                  Có thể chọn nhiều thư mục và file lẻ cùng lúc
                </p>
              )}
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
              <p className="text-text-muted text-sm mt-1 max-w-sm mx-auto">
                {errorMessage ?? uploadError ?? 'Đã xảy ra lỗi không xác định.'}
              </p>
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setStep('metadata');
                }}
                className="btn-primary mt-4"
              >
                Thử lại
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
