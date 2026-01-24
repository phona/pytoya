import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useMemo, useState } from 'react';
import { changePassword } from '@/api/auth';
import { getApiErrorInfo, getApiErrorText } from '@/api/client';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { useI18n } from '@/shared/providers/I18nProvider';
import { changePasswordSchema, ChangePasswordFormValues } from '@/shared/schemas/user.schema';
import { useAuthStore } from '@/shared/stores/auth';
import { useForm } from 'react-hook-form';

export function ProfilePage() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onSubmit',
  });

  const userSummary = useMemo(() => {
    if (!user) {
      return null;
    }
    return {
      username: user.username,
      role: user.role,
    };
  }, [user]);

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setStatus(null);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      form.reset();
      setStatus({ type: 'success', message: t('profile.changePassword.success') });
    } catch (error) {
      const info = getApiErrorInfo(error);
      const isWrongCurrentPassword =
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        info.code !== 'AUTH_INVALID_TOKEN' &&
        info.code !== 'AUTH_MISSING_TOKEN';

      if (isWrongCurrentPassword) {
        form.setError('currentPassword', {
          type: 'server',
          message: t('profile.changePassword.invalidCurrentPassword'),
        });
        return;
      }

      setStatus({
        type: 'error',
        message: getApiErrorText(error, t, { fallbackKey: 'profile.changePassword.errorFallback' }),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t('profile.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('profile.subtitle')}</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.accountTitle')}</CardTitle>
              <CardDescription>{t('profile.accountSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('profile.usernameLabel')}</span>
                <span className="font-medium text-foreground">{userSummary?.username ?? '—'}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('profile.roleLabel')}</span>
                <span className="font-medium text-foreground">{userSummary?.role ?? '—'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('profile.changePassword.title')}</CardTitle>
              <CardDescription>{t('profile.changePassword.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              {status ? (
                <div
                  role="status"
                  className={`mb-4 rounded-md border px-3 py-2 text-sm ${
                    status.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  {status.message}
                </div>
              ) : null}

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profile.changePassword.currentPasswordLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="current-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profile.changePassword.newPasswordLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profile.changePassword.confirmPasswordLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? t('common.saving') : t('common.save')}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
