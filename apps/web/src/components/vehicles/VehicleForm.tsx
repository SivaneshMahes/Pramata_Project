import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { VEHICLE_TYPES } from '@vrp/shared-types';
import { MAX_VEHICLE_FEATURES, vehicleInputSchema } from '@vrp/validation';
import type { VehicleInput } from '@vrp/validation';
import { errorMessage } from '@/api/client';
import { VEHICLE_TYPE_LABELS } from '@/constants/labels';
import { useToast } from '@/context/ToastContext';
import type { VehicleDto } from '@/types';
import { applyServerErrors } from '@/utils/forms';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Field } from '../common/Field';
import { Input, Select, Textarea } from '../common/Input';
import { Switch } from '../common/Switch';
import { FeaturesInput } from './FeaturesInput';
import { ImagesField } from './ImagesField';

type FormInput = z.input<typeof vehicleInputSchema>;
const FIELDS = [
  'name',
  'description',
  'images',
  'type',
  'registrationNumber',
  'dailyPrice',
  'location',
  'isAvailable',
  'features',
] as const;

interface VehicleFormProps {
  initial?: VehicleDto;
  submitLabel: string;
  onSubmit: (input: VehicleInput) => Promise<unknown>;
  onCancel: () => void;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="grid gap-6 p-5 sm:p-6 md:grid-cols-[14rem_1fr]">
      <div>
        <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </Card>
  );
}

export function VehicleForm({ initial, submitLabel, onSubmit, onCancel }: VehicleFormProps) {
  const toast = useToast();
  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormInput, unknown, VehicleInput>({
    resolver: zodResolver(vehicleInputSchema),
    mode: 'onTouched',
    defaultValues: initial
      ? {
          name: initial.name,
          description: initial.description,
          images: initial.images,
          type: initial.type,
          registrationNumber: initial.registrationNumber,
          dailyPrice: initial.dailyPrice,
          location: initial.location,
          isAvailable: initial.isAvailable,
          features: initial.features,
        }
      : {
          name: '',
          description: '',
          images: [],
          type: 'CAR',
          registrationNumber: '',
          dailyPrice: '',
          location: '',
          isAvailable: true,
          features: [],
        },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (!applyServerErrors(error, setError, FIELDS)) {
        if ((error as { code?: string }).code === 'REGISTRATION_TAKEN') {
          setError('registrationNumber', { message: errorMessage(error) });
        } else {
          toast.error('Couldn’t save the vehicle', errorMessage(error));
        }
      }
    }
  });

  const type = watch('type') ?? 'CAR';

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Section title="Basics" description="What renters see first in search results.">
        <Field label="Make and model" error={errors.name?.message}>
          <Input {...register('name')} placeholder="e.g. Honda City" autoComplete="off" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type" error={errors.type?.message}>
            <Select {...register('type')}>
              {VEHICLE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {VEHICLE_TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Registration number"
            error={errors.registrationNumber?.message}
            hint="Spaces and dashes are removed automatically."
          >
            <Input
              {...register('registrationNumber')}
              placeholder="TN 37 AB 1234"
              autoCapitalize="characters"
              autoComplete="off"
              className="uppercase"
            />
          </Field>
        </div>
        <Field label="Description" error={errors.description?.message}>
          <Textarea
            {...register('description')}
            rows={4}
            placeholder="Condition, mileage, what’s included, pickup instructions…"
          />
        </Field>
      </Section>

      <Section title="Pricing and location" description="The price applies to each rental day.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Daily price (₹)" error={errors.dailyPrice?.message}>
            <Input
              {...register('dailyPrice')}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="1800"
            />
          </Field>
          <Field label="Pickup city" error={errors.location?.message}>
            <Input
              {...register('location')}
              placeholder="Coimbatore"
              autoComplete="address-level2"
            />
          </Field>
        </div>
        <Controller
          control={control}
          name="isAvailable"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-control border border-line px-4 py-3">
              <div>
                <p className="text-sm font-medium">Accepting bookings</p>
                <p className="text-sm text-muted">
                  Turn off to pause new requests. Existing bookings stay.
                </p>
              </div>
              <Switch
                checked={field.value ?? true}
                onChange={field.onChange}
                label="Accepting bookings"
              />
            </div>
          )}
        />
      </Section>

      <Section
        title="Features"
        description={`Up to ${MAX_VEHICLE_FEATURES}. The first three appear on the listing card.`}
      >
        <Controller
          control={control}
          name="features"
          render={({ field }) => (
            <Field
              label="Features"
              error={errors.features?.message ?? errors.features?.[0]?.message}
            >
              <FeaturesInput
                value={field.value ?? []}
                onChange={field.onChange}
                onBlur={field.onBlur}
                max={MAX_VEHICLE_FEATURES}
              />
            </Field>
          )}
        />
      </Section>

      <Section
        title="Photos"
        description="Bright, uncluttered photos get more bookings. The first is the cover."
      >
        <Controller
          control={control}
          name="images"
          render={({ field }) => (
            <ImagesField
              value={field.value ?? []}
              onChange={field.onChange}
              type={type}
              error={errors.images?.message ?? errors.images?.[0]?.url?.message}
            />
          )}
        />
      </Section>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={Boolean(initial) && !isDirty}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
