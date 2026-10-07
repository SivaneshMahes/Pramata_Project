import type { LoginInput, RegisterInput, UpdateProfileInput } from '@vrp/validation';
import { http, unwrap } from '@/api/client';
import type { AuthResultDto } from '@/types';

export const authService = {
  me: () => unwrap<AuthResultDto>(http.get('/auth/me')),
  login: (input: LoginInput) => unwrap<AuthResultDto>(http.post('/auth/login', input)),
  register: (input: RegisterInput) => unwrap<AuthResultDto>(http.post('/auth/register', input)),
  logout: () => unwrap<{ loggedOut: boolean }>(http.post('/auth/logout')),
  updateProfile: (input: UpdateProfileInput) =>
    unwrap<AuthResultDto>(http.patch('/users/me', input)),
};
