import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage, http, unwrap } from '@/api/client';
import { dashboardPathFor, paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { UserDto } from '@/types';
import { safeRedirect } from '@/utils/redirect';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleIdApi {
  initialize: (options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    ux_mode?: string;
  }) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

function loadScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = Object.assign(document.createElement('script'), {
      src: SCRIPT_SRC,
      async: true,
      defer: true,
    });
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in failed to load'));
    document.head.appendChild(script);
  });
}

/**
 * "Continue with Google" via Google Identity Services. The ID token goes to
 * our API, which verifies it and sets the same session cookie as a password
 * login. Renders nothing unless VITE_GOOGLE_CLIENT_ID is configured.
 */
export function GoogleSignIn({ redirect }: { redirect: string | null }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const { setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            try {
              const { user, isNewUser } = await unwrap<{ user: UserDto; isNewUser: boolean }>(
                http.post('/auth/google', { credential }),
              );
              setUser(user);
              if (!user.role) navigate(paths.onboarding, { replace: true });
              else {
                if (!isNewUser) toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
                navigate(safeRedirect(redirect, dashboardPathFor(user.role)), { replace: true });
              }
            } catch (error) {
              toast.error('Google sign-in failed', errorMessage(error));
            }
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: buttonRef.current.offsetWidth || 320,
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [navigate, redirect, setUser, toast]);

  if (!CLIENT_ID || failed) return null;
  return (
    <>
      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <div ref={buttonRef} className="flex min-h-10 justify-center" />
    </>
  );
}
