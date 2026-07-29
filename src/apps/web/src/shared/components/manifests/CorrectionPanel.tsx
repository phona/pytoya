import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft, Loader2, CheckCircle2, ImageIcon, Send, SkipForward } from 'lucide-react';
import { usePendingCrops, useVerifyCrop, useCropImageUrl } from '@/shared/hooks/use-correction';
import { useManifest } from '@/shared/hooks/use-manifests';
import { useProject, useGroups } from '@/shared/hooks/use-projects';
import { AppBreadcrumbs } from '@/shared/components/AppBreadcrumbs';
import { BboxEditor } from './BboxEditor';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
import { useI18n } from '@/shared/providers/I18nProvider';
import { toast } from '@/shared/hooks/use-toast';

interface CorrectionPanelProps {
  projectId: number;
  groupId: number;
  manifestId: number;
}

export function CorrectionPanel({ projectId, groupId, manifestId }: CorrectionPanelProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: manifest } = useManifest(manifestId);
  const { project } = useProject(projectId);
  const { groups } = useGroups(projectId);
  const { data: pendingData, isLoading: isLoadingCrops } = usePendingCrops(manifestId);
  const verifyCrop = useVerifyCrop(manifestId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctedText, setCorrectedText] = useState('');
  const [bboxDialogOpen, setBboxDialogOpen] = useState(false);

  const items = pendingData?.items ?? [];
  const total = pendingData?.total ?? 0;
  const currentItem = items[currentIndex] ?? null;

  const cropUrl = useCropImageUrl(currentItem?.cropImage ?? '');

  const groupLabel = groups?.find((g) => g.id === groupId)?.name ?? t('groups.fallbackName', { id: groupId });
  const projectLabel = project?.name ?? t('projects.fallbackName', { id: projectId });

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
    setCorrectedText('');
  }, []);

  const handleSubmit = useCallback(() => {
    if (!currentItem) return;
    verifyCrop.mutate(
      {
        field: currentItem.field,
        page: currentItem.page,
        correctedText: correctedText.trim() || currentItem.ocrText,
      },
      {
        onSuccess: () => {
          toast({ description: t('audit.save.saved') });
          if (currentIndex < items.length - 1) {
            goTo(currentIndex + 1);
          } else {
            setCurrentIndex(items.length);
          }
        },
        onError: () => {
          toast({ description: t('audit.save.failed'), variant: 'destructive' });
        },
      },
    );
  }, [currentItem, correctedText, currentIndex, items.length, verifyCrop, goTo, t]);

  const handleSkip = useCallback(() => {
    if (currentIndex < items.length - 1) {
      goTo(currentIndex + 1);
    } else {
      setCurrentIndex(items.length);
    }
  }, [currentIndex, items.length, goTo]);

  const handleBack = useCallback(() => {
    navigate(`/projects/${projectId}/groups/${groupId}/manifests/${manifestId}`);
  }, [navigate, projectId, groupId, manifestId]);

  if (isLoadingCrops) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (total === 0 || currentIndex >= items.length) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="px-6 py-4 border-b border-border bg-card">
          <AppBreadcrumbs
            items={[
              { label: t('nav.projects'), to: '/projects' },
              { label: projectLabel, to: `/projects/${projectId}` },
              { label: t('manifests.breadcrumbWithGroup', { group: groupLabel }), to: `/projects/${projectId}/groups/${groupId}/manifests` },
              { label: manifest?.originalFilename ?? '' },
              { label: t('correction.title') },
            ]}
          />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-semibold">{t('correction.allDone')}</h2>
          <p className="text-muted-foreground">{t('correction.noPending')}</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('correction.back')}
          </Button>
        </div>
      </div>
    );
  }

  if (!currentItem) return null;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <AppBreadcrumbs
          className="mb-1"
          items={[
            { label: t('nav.projects'), to: '/projects' },
            { label: projectLabel, to: `/projects/${projectId}` },
            { label: t('manifests.breadcrumbWithGroup', { group: groupLabel }), to: `/projects/${projectId}/groups/${groupId}/manifests` },
            { label: manifest?.originalFilename ?? '' },
            { label: t('correction.title') },
          ]}
        />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{manifest?.originalFilename}</h2>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1}/{total}
          </span>
        </div>
      </div>

      <div className="px-6 py-2 border-b border-border flex items-center gap-2 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('correction.back')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentIndex === 0}
          onClick={() => goTo(currentIndex - 1)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t('correction.prev')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentIndex >= items.length - 1}
          onClick={() => goTo(currentIndex + 1)}
        >
          {t('correction.next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-4">
              <div
                className="relative mb-3 cursor-pointer rounded border overflow-hidden bg-muted"
                onClick={() => setBboxDialogOpen(true)}
              >
                {cropUrl ? (
                  <img src={cropUrl} alt={currentItem.field} className="w-full h-auto" />
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-0 ring-1 ring-blue-500/30 ring-inset pointer-events-none" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="font-medium text-foreground">{currentItem.field}</span>
                <Badge variant="outline" className="text-xs">
                  {t('correction.confidence')}: {(currentItem.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
              {currentItem.reason && (
                <p className="text-xs text-muted-foreground mb-2">
                  <span className="font-medium">{t('correction.reason')}:</span> {currentItem.reason}
                </p>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setBboxDialogOpen(true)}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                {t('correction.bbox')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  {t('correction.ocrText')}
                </label>
                <div className="rounded border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {currentItem.ocrText}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  {t('correction.corrected')}
                </label>
                <Textarea
                  value={correctedText}
                  onChange={(e) => setCorrectedText(e.target.value)}
                  placeholder={currentItem.ocrText}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={verifyCrop.isPending}
                  className="flex-1"
                >
                  {verifyCrop.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {t('correction.submit')}
                </Button>
                <Button variant="outline" onClick={handleSkip} disabled={verifyCrop.isPending}>
                  <SkipForward className="mr-2 h-4 w-4" />
                  {t('correction.skip')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {currentItem && (
        <BboxEditor
          manifestId={manifestId}
          page={currentItem.page}
          bbox={currentItem.bbox}
          open={bboxDialogOpen}
          onOpenChange={setBboxDialogOpen}
        />
      )}
    </div>
  );
}
