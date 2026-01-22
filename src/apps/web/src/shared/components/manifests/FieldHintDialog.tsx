import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { getApiErrorText } from '@/api/client';
import { toast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useI18n } from '@/shared/providers/I18nProvider';

interface FieldHintDialogProps {
  open: boolean;
  onClose: () => void;
  fieldPath: string;
  jsonSchema: Record<string, unknown>;
  onSubmit: (nextSchema: Record<string, unknown>) => Promise<void>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const decodeJsonPointerToken = (token: string): string =>
  token.replace(/~1/g, '/').replace(/~0/g, '~');

const resolveJsonPointer = (root: unknown, pointer: string): unknown => {
  if (pointer === '#') {
    return root;
  }

  if (!pointer.startsWith('#/')) {
    return undefined;
  }

  const tokens = pointer
    .slice('#/'.length)
    .split('/')
    .map(decodeJsonPointerToken)
    .filter(Boolean);

  let current: unknown = root;
  for (const token of tokens) {
    if (isRecord(current)) {
      current = current[token];
      continue;
    }
    if (Array.isArray(current)) {
      const index = Number.parseInt(token, 10);
      if (!Number.isFinite(index)) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    return undefined;
  }

  return current;
};

const resolveSchemaNode = (
  root: Record<string, unknown>,
  schema: Record<string, unknown>,
  seenRefs = new Set<string>(),
  depth = 0,
): Record<string, unknown> => {
  if (depth > 25) {
    return schema;
  }

  const ref = typeof schema.$ref === 'string' ? schema.$ref.trim() : '';
  if (!ref || seenRefs.has(ref)) {
    return schema;
  }

  const target = resolveJsonPointer(root, ref);
  if (!isRecord(target)) {
    return schema;
  }

  const { $ref: _ignored, ...rest } = schema;
  seenRefs.add(ref);
  return {
    ...resolveSchemaNode(root, target, seenRefs, depth + 1),
    ...rest,
  };
};

const parsePathPart = (part: string): { key: string; isArrayItem: boolean } => {
  const anyMatch = part.match(/(.+)\[\]$/);
  if (anyMatch) {
    return { key: anyMatch[1], isArrayItem: true };
  }
  return { key: part, isArrayItem: false };
};

const getItemsSchema = (schema: Record<string, unknown>): Record<string, unknown> | null => {
  const items = schema.items;
  if (!items) return null;
  if (Array.isArray(items)) {
    const first = items[0];
    return isRecord(first) ? first : null;
  }
  return isRecord(items) ? items : null;
};

const getSchemaNode = (
  schema: Record<string, unknown>,
  fieldPath: string,
): Record<string, unknown> | null => {
  const parts = fieldPath.split('.').filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  let current: Record<string, unknown> = schema;
  for (const part of parts) {
    current = resolveSchemaNode(schema, current);
    const { key, isArrayItem } = parsePathPart(part);
    const properties = isRecord(current.properties) ? (current.properties as Record<string, unknown>) : null;
    const next = properties?.[key];
    if (!isRecord(next)) {
      return null;
    }

    const resolvedNext = resolveSchemaNode(schema, next);
    if (isArrayItem) {
      const itemsSchema = getItemsSchema(resolvedNext);
      if (!itemsSchema) {
        return null;
      }
      current = itemsSchema;
      continue;
    }

    current = resolvedNext;
  }

  return current;
};

const getCurrentHint = (
  schema: Record<string, unknown>,
  fieldPath: string,
): string => {
  const node = getSchemaNode(schema, fieldPath);
  if (!node) return '';
  const raw = node['x-extraction-hint'];
  return typeof raw === 'string' ? raw : '';
};

const applyHintToSchema = (
  schema: Record<string, unknown>,
  fieldPath: string,
  hint: string,
): Record<string, unknown> | null => {
  const clone = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
  const node = getSchemaNode(clone, fieldPath);
  if (!node) {
    return null;
  }

  const trimmed = hint.trim();
  if (!trimmed) {
    delete node['x-extraction-hint'];
    return clone;
  }

  node['x-extraction-hint'] = trimmed;
  return clone;
};

export function FieldHintDialog({ open, onClose, fieldPath, jsonSchema, onSubmit }: FieldHintDialogProps) {
  const { t } = useI18n();
  const [hint, setHint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentHint = useMemo(() => getCurrentHint(jsonSchema, fieldPath), [jsonSchema, fieldPath]);
  const schemaNodeExists = useMemo(() => Boolean(getSchemaNode(jsonSchema, fieldPath)), [jsonSchema, fieldPath]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setHint(currentHint);
  }, [currentHint, open]);

  const handleSave = async () => {
    if (isSubmitting) {
      return;
    }

    const nextSchema = applyHintToSchema(jsonSchema, fieldPath, hint);
    if (!nextSchema) {
      toast({
        variant: 'destructive',
        title: t('audit.fieldHint.fieldNotFoundTitle'),
        description: t('audit.fieldHint.fieldNotFoundDescription', { field: fieldPath }),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(nextSchema);
      toast({
        title: t('audit.fieldHint.updatedTitle'),
        description: fieldPath,
      });
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('audit.fieldHint.updateFailedTitle'),
        description: getApiErrorText(error, t),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('audit.fieldHint.title')}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap">
            {t('audit.fieldHint.description', { field: fieldPath })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="field-hint-textarea">x-extraction-hint</Label>
            <Textarea
              id="field-hint-textarea"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder={t('audit.fieldHint.placeholder')}
              className="mt-1 min-h-[120px]"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('audit.fieldHint.helper')}
            </p>
          </div>

          {!schemaNodeExists && (
            <p className="text-xs text-destructive">
              {t('audit.fieldHint.schemaMissing')}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting || !schemaNodeExists}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
