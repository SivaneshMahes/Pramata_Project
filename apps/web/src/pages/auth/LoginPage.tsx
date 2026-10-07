import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { loginSchema } from '@/schemas';
import type { LoginInput } from '@vrp/validation';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { Field } from '@/components/common/Field';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { dashboardPathFor, paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { safeRedirect } from '@/utils/redirect';
import { AuthShell } from './AuthShell';
import { GoogleSignIn } from './GoogleSignIn';

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), mode: 'onTouched' });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login(values);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate(safeRedirect(params.get('redirect'), dashboardPathFor(user.role)), {
        replace: true,
      });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  const registerHref = params.get('redirect')
    ? `${paths.register}?redirect=${encodeURIComponent(params.get('redirect')!)}`
    : paths.register;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Manage your rentals and listings."
      footer={
        <>
          New here?{' '}
          <Link to={registerHref} className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {formError && (
          <p
            role="alert"
            className="rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger"
          >
            {formError}
          </p>
        )}
        <Field label="Email" error={errors.email?.message}>
          <Input
            {...register('email')}
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
          />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput {...register('password')} autoComplete="current-password" />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-1">
          Sign in
        </Button>
        <GoogleSignIn redirect={params.get('redirect')} />
      </form>
    </AuthShell>
  );
}
