'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { manifestsApi } from '@/api/manifests';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface UploadDialogProps {
  groupId: number;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (uploaded: number) => void;
}

export function UploadDialog({ groupId, isOpen, onClose, onComplete }: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setUploads(
      selectedFiles.map((file) => ({
        fileName: file.name,
        progress: 0,
        status: 'pending' as const,
      })),
    );
  };

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    try {
      const results = await manifestsApi.uploadManifestsBatch(groupId, files, (index, fileName, progress) => {
        setUploads((prev) =>
          prev.map((u, i) =>
            i === index ? { ...u, progress, status: 'uploading' } : u,
          ),
        );
      });

      setUploads((prev) =>
        prev.map((u, i) => {
          const result = results[i];
          if (result.status === 'fulfilled') {
            successCount++;
            return { ...u, progress: 100, status: 'success' };
          } else {
            return { ...u, status: 'error', error: result.reason?.message || 'Upload failed' };
          }
        }),
      );

      if (onComplete) {
        onComplete(successCount);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  }, [files, groupId, onComplete]);

  const handleClose = useCallback(() => {
    if (!isUploading) {
      setFiles([]);
      setUploads([]);
      onClose();
    }
  }, [isUploading, onClose]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => closeButtonRef.current?.focus());
      return;
    }

    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-dialog-title"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 id="upload-dialog-title" className="text-xl font-semibold text-gray-900">
              Upload Manifests
            </h2>
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
              aria-label="Close upload dialog"
              ref={closeButtonRef}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <label htmlFor="uploadFiles" className="block text-sm font-medium text-gray-700 mb-2">
              Select PDF files
            </label>
            <input
              id="uploadFiles"
              type="file"
              multiple
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              disabled={isUploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            />
          </div>

          {uploads.length > 0 && (
            <div className="mb-4 space-y-2" aria-live="polite">
              {uploads.map((upload, index) => (
                <div key={index} className="border rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {upload.fileName}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        upload.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : upload.status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : upload.status === 'uploading'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {upload.status === 'success'
                        ? 'Uploaded'
                        : upload.status === 'error'
                        ? 'Failed'
                        : upload.status === 'uploading'
                        ? `${upload.progress}%`
                        : 'Pending'}
                    </span>
                  </div>
                  {upload.status === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}
                  {upload.error && (
                    <p className="text-sm text-red-600 mt-1">{upload.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {files.length > 0 ? 'Cancel' : 'Close'}
            </button>
            {files.length > 0 && (
              <button
                onClick={handleUpload}
                disabled={isUploading || files.length === 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
