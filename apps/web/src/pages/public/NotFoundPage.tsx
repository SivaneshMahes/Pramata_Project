import { Compass } from 'lucide-react';
import { ButtonLink } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { paths } from '@/constants/routes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <EmptyState
        icon={<Compass />}
        title="We couldn’t find that page"
        description="The link may be broken or the page may have moved."
        action={<ButtonLink to={paths.home}>Go to home</ButtonLink>}
      />
    </div>
  );
}
