import { useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Link2, Trash2 } from 'lucide-react';
import { MAX_VEHICLE_IMAGES, vehicleImageSchema } from '@vrp/validation';
import type { VehicleType } from '@/types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { VehicleImage } from '../common/VehicleImage';
import { ImageUploadButton } from './ImageUploadButton';

export interface ImageValue {
  url: string;
  key?: string | undefined;
}

interface ImagesFieldProps {
  value: ImageValue[];
  onChange: (images: ImageValue[]) => void;
  type: VehicleType;
  error?: string | undefined;
}

/** Upload photos to S3 (or paste a URL). The first image is the cover. */
export function ImagesField({ value, onChange, type, error }: ImagesFieldProps) {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const full = value.length >= MAX_VEHICLE_IMAGES;

  const addUrl = () => {
    const parsed = vehicleImageSchema.safeParse({ url: url.trim() });
    if (!parsed.success) {
      setUrlError(parsed.error.issues[0]?.message ?? 'Enter a valid image URL');
      return;
    }
    onChange([...value, { url: parsed.data.url }]);
    setUrl('');
    setUrlError(null);
  };

  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    if (item) next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {value.map((image, index) => (
            <li
              key={`${image.url}-${index}`}
              className="group relative overflow-hidden rounded-lg border border-line"
            >
              <VehicleImage
                src={image.url}
                alt={`Photo ${index + 1}`}
                type={type}
                className="aspect-[4/3] w-full"
              />
              {index === 0 && (
                <span className="absolute top-1.5 left-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[0.6875rem] font-medium text-white">
                  Cover
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <div className="flex gap-1">
                  <IconButton
                    label="Move earlier"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowLeft className="size-3.5" />
                  </IconButton>
                  <IconButton
                    label="Move later"
                    disabled={index === value.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowRight className="size-3.5" />
                  </IconButton>
                </div>
                <IconButton
                  label="Remove photo"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!full && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-line p-3 sm:flex-row sm:items-start">
          <ImageUploadButton onUploaded={(image) => onChange([...value, image])} />
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addUrl();
                  }
                }}
                placeholder="…or paste an image URL"
                aria-label="Image URL"
                aria-invalid={Boolean(urlError) || undefined}
                type="url"
              />
              <Button
                variant="secondary"
                onClick={addUrl}
                disabled={!url.trim()}
                icon={<Link2 className="size-4" />}
              >
                Add
              </Button>
            </div>
            {urlError && <p className="text-xs font-medium text-danger">{urlError}</p>}
          </div>
        </div>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <ImagePlus className="size-3.5" aria-hidden />
        {value.length}/{MAX_VEHICLE_IMAGES} photos. JPEG, PNG or WebP up to 5 MB.
      </p>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="pressable rounded-md bg-white/90 p-1.5 text-ink shadow-sm hover:bg-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}
