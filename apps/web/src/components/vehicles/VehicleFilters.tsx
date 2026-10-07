import { VEHICLE_SORTS, VEHICLE_TYPES } from '@vrp/shared-types';
import { SORT_LABELS, VEHICLE_TYPE_LABELS } from '@/constants/labels';
import type { VehicleFilters as Filters } from '@/types';
import { localToday } from '@/utils/dates';
import { Button } from '../common/Button';
import { Field } from '../common/Field';
import { Input, Select } from '../common/Input';

interface VehicleFiltersProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}

/** Every control updates the URL immediately; results follow. */
export function VehicleFilters({ filters, onChange, onReset }: VehicleFiltersProps) {
  const today = localToday();
  const datesInvalid = Boolean(
    filters.startDate && filters.endDate && filters.endDate <= filters.startDate,
  );

  return (
    <div className="flex flex-col gap-5">
      <Field label="Vehicle type">
        <Select value={filters.type} onChange={(event) => onChange({ type: event.target.value })}>
          <option value="">All types</option>
          {VEHICLE_TYPES.map((type) => (
            <option key={type} value={type}>
              {VEHICLE_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Location">
        <Input
          value={filters.location}
          placeholder="Any city"
          onChange={(event) => onChange({ location: event.target.value })}
          autoComplete="address-level2"
        />
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Price per day (₹)</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input
            inputMode="numeric"
            aria-label="Minimum price per day"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(event) => onChange({ minPrice: event.target.value.replace(/\D/g, '') })}
          />
          <Input
            inputMode="numeric"
            aria-label="Maximum price per day"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(event) => onChange({ maxPrice: event.target.value.replace(/\D/g, '') })}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Available for dates</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            aria-label="Pickup date"
            min={today}
            value={filters.startDate}
            onChange={(event) => onChange({ startDate: event.target.value })}
          />
          <Input
            type="date"
            aria-label="Return date"
            min={filters.startDate || today}
            value={filters.endDate}
            aria-invalid={datesInvalid || undefined}
            onChange={(event) => onChange({ endDate: event.target.value })}
          />
        </div>
        <p className={datesInvalid ? 'text-xs font-medium text-danger' : 'text-xs text-muted'}>
          {datesInvalid
            ? 'Return date must be after pickup.'
            : 'Shows only vehicles free for the whole period.'}
        </p>
      </fieldset>

      <Field label="Sort by">
        <Select value={filters.sort} onChange={(event) => onChange({ sort: event.target.value })}>
          {VEHICLE_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </Select>
      </Field>

      <Button variant="ghost" size="sm" onClick={onReset} className="self-start">
        Clear all filters
      </Button>
    </div>
  );
}
