import { useState, useCallback } from 'react';
import { api } from './api';

export interface FileToUpload {
  file: File;
  relativePath: string;
  sha256: string;
  uploaded: boolean;
  progress: number;
}

export interface PresignedUrl {
  filename: string;
  contentType: string;
  url: string;
  sha256: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
}

/**
 * Hook for uploading files to R2 via presigned URLs
 */
export function useR2Upload() {
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (presignedUrl: string, file: File, onProgress?: (progress: number) => void) => {
      const xhr = new XMLHttpRequest();

      return new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress((prev) => new Map(prev).set(file.name, progress));
            onProgress?.(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress((prev) => {
              const next = new Map(prev);
              next.delete(file.name);
              return next;
            });
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', presignedUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });
    },
    [],
  );

  const uploadFiles = useCallback(
    async (files: FileToUpload[], getPresignedUrl: (file: FileToUpload) => Promise<string>) => {
      setIsUploading(true);
      setError(null);

      try {
        for (const fileToUpload of files) {
          if (fileToUpload.uploaded) continue;

          try {
            const presignedUrl = await getPresignedUrl(fileToUpload);
            await uploadFile(presignedUrl, fileToUpload.file);
            fileToUpload.uploaded = true;
            fileToUpload.progress = 100;
          } catch (err) {
            throw new Error(`Failed to upload ${fileToUpload.relativePath}: ${(err as Error).message}`);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFile],
  );

  return {
    uploadFile,
    uploadFiles,
    uploadProgress,
    isUploading,
    error,
    setError,
  };
}
