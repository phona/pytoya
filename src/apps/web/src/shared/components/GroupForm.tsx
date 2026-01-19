import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CreateGroupDto, UpdateGroupDto, Group } from '@/api/projects';
import { groupSchema, type GroupFormValues } from '@/shared/schemas/group.schema';
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

interface GroupFormProps {
  group?: Group;
  projectId?: number;
  onSubmit: (data: CreateGroupDto | UpdateGroupDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function GroupForm({ group, projectId, onSubmit, onCancel, isLoading }: GroupFormProps) {
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: group?.name ?? '',
    },
  });

  useEffect(() => {
    form.reset({ name: group?.name ?? '' });
  }, [form, group]);

  const handleSubmit = async (values: GroupFormValues) => {
    const name = values.name.trim();
    if (group) {
      const updateData: UpdateGroupDto = { name };
      await onSubmit(updateData);
      return;
    }
    if (!projectId) {
      return;
    }
    const data: CreateGroupDto = { name, projectId };
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="group-name">Group Name *</FormLabel>
              <FormControl>
                <Input {...field} id="group-name" placeholder="Group A" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : group ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}




