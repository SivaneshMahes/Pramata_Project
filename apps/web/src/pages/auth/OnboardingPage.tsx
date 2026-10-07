import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { errorMessage, http, unwrap } from '@/api/client';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { dashboardPathFor, paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { UserDto, UserRole } from '@/types';
import { AuthShell } from './AuthShell';
import { RolePicker } from './RolePicker';

/** New Google users pick their role once before using the app. */
export default function OnboardingPage() {
  useDocumentTitle('Finish setting up');
  const { user, isLoading, setUser } = useAuth();
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  if (isLoading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Spinner label="Loading" />
      </div>
    );
  if (!user) return <Navigate to={paths.login} replace />;
  if (user.role) return <Navigate to={dashboardPathFor(user.role)} replace />;

  const submit = async () => {
    setSubmitting(true);
    try {
      const { user: updated } = await unwrap<{ user: UserDto }>(
        http.post('/auth/onboarding', { role }),
      );
      setUser(updated);
      toast.success('You’re all set');
      navigate(updated.role === 'OWNER' ? paths.owner.newVehicle : paths.browse, { replace: true });
    } catch (error) {
      toast.error('Couldn’t save your choice', errorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={`Welcome, ${user.name.split(' ')[0]}`}
      subtitle="One last step before you get started."
      footer="You can’t change this later, so pick what fits best."
    >
      <div className="flex flex-col gap-5">
        <RolePicker value={role} onChange={setRole} />
        <Button size="lg" onClick={submit} loading={submitting}>
          Continue
        </Button>
      </div>
    </AuthShell>
  );
}
