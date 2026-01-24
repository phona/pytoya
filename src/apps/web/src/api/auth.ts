import apiClient from '@/api/client';

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export async function changePassword(request: ChangePasswordRequest): Promise<void> {
  await apiClient.post('/auth/change-password', request);
}

