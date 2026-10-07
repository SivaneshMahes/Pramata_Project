import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { http } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import type { BookingDto } from '@/types';
import { Button } from '../common/Button';

const INVOICEABLE = new Set(['APPROVED', 'HANDED_OVER', 'RETURNED']);

/** Downloads the server-generated PDF invoice (authorised like the booking). */
export function InvoiceButton({
  booking,
  size = 'md',
}: {
  booking: BookingDto;
  size?: 'sm' | 'md';
}) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  if (!INVOICEABLE.has(booking.status)) return null;

  const download = async () => {
    setBusy(true);
    try {
      const response = await http.get<Blob>(`/bookings/${booking.id}/invoice`, {
        responseType: 'blob',
      });
      const disposition = String(response.headers['content-disposition'] ?? '');
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `invoice-${booking.id}.pdf`;
      const url = URL.createObjectURL(response.data);
      const link = Object.assign(document.createElement('a'), { href: url, download: filename });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('Couldn’t download the invoice', 'Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size={size}
      onClick={download}
      loading={busy}
      icon={<FileDown className="size-4" />}
    >
      Download invoice
    </Button>
  );
}
