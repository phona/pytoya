import { useCallback, useRef, useState } from 'react';
import { manifestsApi } from '@/api/manifests';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Progress } from '@/shared/components/ui/progress';
import { useI18n } from '@/shared/providers/I18nProvider';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'duplicate' | 'error';
  manifestId?: number;
  error?: string;
}

interface UploadDialogProps {
  projectId: number;
  groupId: number;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (uploaded: number) => void;
}

export function UploadDialog({ projectId, groupId, isOpen, onClose, onComplete }: UploadDialogProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

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
            const isDuplicate = result.value?.isDuplicate === true;
            const manifestId = result.value?.id;
            if (!isDuplicate) {
              successCount++;
            }
            return { ...u, progress: 100, status: isDuplicate ? 'duplicate' : 'success', manifestId };
          } else {
            return { ...u, status: 'error', error: result.reason?.message || t('upload.errorFallback') };
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
  }, [files, groupId, onComplete, t]);

  const handleClose = useCallback(() => {
    if (!isUploading) {
      setFiles([]);
      setUploads([]);
      onClose();
    }
  }, [isUploading, onClose]);

  const summary = (() => {
    if (isUploading) return null;
    if (uploads.length === 0) return null;
    const created = uploads.filter((u) => u.status === 'success').length;
    const duplicates = uploads.filter((u) => u.status === 'duplicate').length;
    const failed = uploads.filter((u) => u.status === 'error').length;
    return { created, duplicates, failed };
  })();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('upload.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('upload.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="mb-4">
          <label htmlFor="uploadFiles" className="block text-sm font-medium text-foreground mb-2">
            {t('upload.selectFilesLabel')}
          </label>
          <input
            id="uploadFiles"
            type="file"
            multiple
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={isUploading}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10 disabled:opacity-50"
          />
        </div>

        {uploads.length > 0 && (
          <div className="mb-4 space-y-2" aria-live="polite" data-testid="upload-results">
            {summary ? (
              <div
                className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground"
                data-testid="upload-summary"
              >
                {t('upload.summary', summary)}
              </div>
            ) : null}
            {uploads.map((upload, index) => (
              <div
                key={index}
                className="border rounded-md p-3"
                data-testid={`upload-item-${index}`}
                data-upload-status={upload.status}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground truncate max-w-xs">
                    {upload.fileName}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      upload.status === 'success'
                        ? 'bg-[color:var(--status-completed-bg)] text-[color:var(--status-completed-text)]'
                        : upload.status === 'duplicate'
                        ? 'bg-[color:var(--status-verified-bg)] text-[color:var(--status-verified-text)]'
                        : upload.status === 'error'
                        ? 'bg-[color:var(--status-failed-bg)] text-[color:var(--status-failed-text)]'
                        : upload.status === 'uploading'
                        ? 'bg-[color:var(--status-processing-bg)] text-[color:var(--status-processing-text)]'
                        : 'bg-[color:var(--status-pending-bg)] text-[color:var(--status-pending-text)]'
                    }`}
                    data-testid={`upload-item-status-${index}`}
                    data-upload-status={upload.status}
                  >
                    {upload.status === 'success'
                      ? t('upload.status.uploaded')
                      : upload.status === 'duplicate'
                      ? t('upload.status.duplicate')
                      : upload.status === 'error'
                      ? t('upload.status.failed')
                      : upload.status === 'uploading'
                      ? `${upload.progress}%`
                      : t('upload.status.pending')}
                  </span>
                </div>
                {upload.status === 'uploading' && (
                  <Progress
                    value={upload.progress}
                    className="h-2 bg-muted"
                    indicatorClassName="bg-primary"
                  />
                )}
                {upload.status === 'duplicate' && upload.manifestId ? (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`upload-item-open-existing-${index}`}
                      onClick={() => {
                        handleClose();
                        navigate(`/projects/${projectId}/groups/${groupId}/manifests/${upload.manifestId}`);
                      }}
                    >
                      {t('upload.openExisting')}
                    </Button>
                  </div>
                ) : null}
                {upload.error && (
                  <p className="text-sm text-destructive mt-1">{upload.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
        <DialogFooter className="gap-3 sm:gap-3">
          <Button
            ref={closeButtonRef}
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            {files.length > 0 ? t('common.cancel') : t('common.close')}
          </Button>
          {files.length > 0 && (
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || files.length === 0}
            >
              {isUploading
                ? t('upload.uploading')
                : t('upload.uploadCount', {
                    count: files.length,
                    plural: files.length === 1 ? '' : 's',
                  })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




