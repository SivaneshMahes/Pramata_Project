import { useEffect } from 'react';

const APP_NAME = 'Wheelhouse';

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : `${APP_NAME} — Vehicle rentals`;
  }, [title]);
}
