import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { registerSchema } from '@/schemas';
import type { RegisterInput } from '@vrp/validation';
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
import { applyServerErrors } from '@/utils/forms';
import { AuthShell } from './AuthShell';
import { GoogleSignIn } from './GoogleSignIn';
import { RolePicker } from './RolePicker';

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const { register: signUp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { role: params.get('role') === 'OWNER' ? 'OWNER' : 'CUSTOMER' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      const user = await signUp(values);
      toast.success(
        'Your account is ready',
        user.role === 'OWNER'
          ? 'Add your first vehicle to start earning.'
          : 'Find a vehicle and pick your dates.',
      );
      const fallback = user.role === 'OWNER' ? paths.owner.newVehicle : dashboardPathFor(user.role);
      navigate(safeRedirect(params.get('redirect'), fallback), { replace: true });
    } catch (error) {
      if ((error as { code?: string }).code === 'EMAIL_TAKEN')
        setError('email', { message: errorMessage(error) });
      else if (!applyServerErrors(error, setError, ['name', 'email', 'password', 'role']))
        toast.error('Couldn’t create your account', errorMessage(error));
    }
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to={paths.login} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <RolePicker
          value={watch('role')}
          onChange={(role) => setValue('role', role, { shouldValidate: true })}
          error={errors.role?.message}
        />
        <Field label="Full name" error={errors.name?.message}>
          <Input {...register('name')} autoComplete="name" />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input {...register('email')} type="email" autoComplete="email" inputMode="email" />
        </Field>
        <Field
          label="Password"
          error={errors.password?.message}
          hint="At least 8 characters, with a letter and a number."
        >
          <PasswordInput {...register('password')} autoComplete="new-password" />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-1">
          Create account
        </Button>
        <GoogleSignIn redirect={params.get('redirect')} />
      </form>
    </AuthShell>
  );
}
