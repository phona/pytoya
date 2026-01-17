import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CreateProjectDto, UpdateProjectDto, Project } from '@/api/projects';
import { useModels } from '@/shared/hooks/use-models';
import { projectSchema, type ProjectFormValues } from '@/shared/schemas/project.schema';
import { Button } from '@/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

interface ProjectFormProps {
  project?: Project;
  onSubmit: (data: CreateProjectDto | UpdateProjectDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProjectForm({ project, onSubmit, onCancel, isLoading }: ProjectFormProps) {
  const { models: ocrModels } = useModels({ category: 'ocr' });
  const { models: llmModels } = useModels({ category: 'llm' });

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
      ocrModelId: project?.ocrModelId ?? '',
      llmModelId: project?.llmModelId ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      name: project?.name ?? '',
      description: project?.description ?? '',
      ocrModelId: project?.ocrModelId ?? '',
      llmModelId: project?.llmModelId ?? '',
    });
  }, [form, project]);

  const handleSubmit = async (values: ProjectFormValues) => {
    const name = values.name.trim();
    const description = values.description?.trim() || undefined;
    const ocrModelId = values.ocrModelId || undefined;
    const llmModelId = values.llmModelId || undefined;

    if (project) {
      const updateData: UpdateProjectDto = {
        name,
        description,
        ocrModelId,
        llmModelId,
      };
      await onSubmit(updateData);
    } else {
      const data: CreateProjectDto = {
        name,
        description,
        ocrModelId,
        llmModelId,
      };
      await onSubmit(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="project-name">Project Name *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  id="project-name"
                  aria-label="Project name"
                  placeholder="My Project"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="project-description">Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  id="project-description"
                  aria-label="Project description"
                  rows={3}
                  placeholder="Optional description..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="ocrModelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>OCR Model</FormLabel>
                <Select
                  value={field.value || 'none'}
                  onValueChange={(value) =>
                    field.onChange(value === 'none' ? '' : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger aria-label="OCR model">
                      <SelectValue placeholder="No OCR model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No OCR model</SelectItem>
                    {ocrModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="llmModelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LLM Model</FormLabel>
                <Select
                  value={field.value || 'none'}
                  onValueChange={(value) =>
                    field.onChange(value === 'none' ? '' : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger aria-label="LLM model">
                      <SelectValue placeholder="No LLM model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No LLM model</SelectItem>
                    {llmModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : project ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
