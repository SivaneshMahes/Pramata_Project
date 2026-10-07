import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { updateProfileSchema } from '@/schemas';
import type { UpdateProfileInput } from '@vrp/validation';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Field } from '@/components/common/Field';
import { Input } from '@/components/common/Input';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { authService } from '@/services/auth.service';
import { formatDate } from '@/utils/format';

export default function CustomerProfilePage() {
  useDocumentTitle('Profile');
  const { user, setUser } = useAuth();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    mode: 'onTouched',
    defaultValues: { name: user?.name ?? '' },
  });

  if (!user) return null;

  const submit = handleSubmit(async (values) => {
    try {
      const { user: updated } = await authService.updateProfile(values);
      setUser(updated);
      reset({ name: updated.name });
      toast.success('Profile saved');
    } catch (error) {
      toast.error('Couldn’t save your profile', errorMessage(error));
    }
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="Profile" description="How owners see you when you request a vehicle." />
      <Card className="p-5 sm:p-6">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <Field label="Full name" error={errors.name?.message}>
            <Input {...register('name')} autoComplete="name" />
          </Field>
          <Field label="Email" hint="Your sign-in email can’t be changed here.">
            <Input value={user.email} readOnly disabled />
          </Field>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted">
              Member since {formatDate(user.createdAt.slice(0, 10))}
            </p>
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
