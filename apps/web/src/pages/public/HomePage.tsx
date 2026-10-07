import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, Bike, Bus, Car, CarFront, Search } from 'lucide-react';
import { VEHICLE_TYPES } from '@vrp/shared-types';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Input, Select } from '@/components/common/Input';
import { VehicleGrid, VehicleGridSkeleton } from '@/components/vehicles/VehicleGrid';
import { WishlistButton } from '@/components/vehicles/WishlistButton';
import { VEHICLE_TYPE_LABELS } from '@/constants/labels';
import { paths } from '@/constants/routes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useVehicles } from '@/hooks/useVehicles';
import { addDays, localToday } from '@/utils/dates';

const TYPE_ICONS = { CAR: Car, SUV: CarFront, BIKE: Bike, VAN: Bus } as const;

/** A working search page first, not a marketing splash. */
export default function HomePage() {
  useDocumentTitle(undefined);
  const navigate = useNavigate();
  const today = localToday();
  const [form, setForm] = useState({
    search: '',
    type: '',
    location: '',
    startDate: '',
    endDate: '',
  });
  const topRated = useVehicles({ sort: 'rating', limit: 6 });

  const datesInvalid = Boolean(form.startDate && form.endDate && form.endDate <= form.startDate);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (datesInvalid) return;
    const params = new URLSearchParams(Object.entries(form).filter(([, value]) => value));
    navigate(`${paths.browse}?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <section className="pt-10 pb-8 sm:pt-14" aria-labelledby="home-title">
        <h1
          id="home-title"
          className="max-w-xl text-[2rem] font-semibold sm:text-[2.5rem]"
          style={{ letterSpacing: '-0.028em' }}
        >
          Find your next vehicle
        </h1>
        <p className="mt-2 max-w-xl text-[1.0625rem] text-muted">
          Cars, SUVs, bikes and vans from local owners. Pick your dates and see what’s free.
        </p>

        <form
          onSubmit={submit}
          className="mt-6 grid gap-3 rounded-2xl border border-line bg-surface p-3 shadow-raised sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_0.9fr_0.9fr_auto]"
          role="search"
        >
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              aria-label="Search"
              placeholder="Make or model"
              className="pl-9"
              value={form.search}
              onChange={(e) => setForm({ ...form, search: e.target.value })}
            />
          </div>
          <Select
            aria-label="Vehicle type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="">Any type</option>
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {VEHICLE_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
          <Input
            aria-label="Location"
            placeholder="City"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <Input
            type="date"
            aria-label="Pickup date"
            min={today}
            value={form.startDate}
            onChange={(e) =>
              setForm({
                ...form,
                startDate: e.target.value,
                endDate:
                  form.endDate && form.endDate <= e.target.value
                    ? addDays(e.target.value, 1)
                    : form.endDate,
              })
            }
          />
          <Input
            type="date"
            aria-label="Return date"
            min={form.startDate ? addDays(form.startDate, 1) : today}
            value={form.endDate}
            aria-invalid={datesInvalid || undefined}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
          <Button
            type="submit"
            className="sm:col-span-2 lg:col-span-1"
            icon={<Search className="size-4" />}
          >
            Search
          </Button>
        </form>

        <nav aria-label="Browse by type" className="mt-4 flex flex-wrap gap-2">
          {VEHICLE_TYPES.map((type) => {
            const Icon = TYPE_ICONS[type];
            return (
              <Link
                key={type}
                to={`${paths.browse}?type=${type}`}
                className="pressable inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium hover:border-slate-300"
              >
                <Icon className="size-4 text-muted" aria-hidden />
                {VEHICLE_TYPE_LABELS[type]}
              </Link>
            );
          })}
        </nav>
      </section>

      <section aria-labelledby="top-rated" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h2 id="top-rated" className="text-lg font-semibold">
            Top rated
          </h2>
          <Link
            to={`${paths.browse}?sort=rating`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            See all <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        {topRated.isPending ? (
          <VehicleGridSkeleton count={6} />
        ) : topRated.isError ? (
          <ErrorState error={topRated.error} onRetry={() => void topRated.refetch()} />
        ) : topRated.data.items.length === 0 ? (
          <EmptyState
            icon={<Car />}
            title="No vehicles listed yet"
            description="Owners can list a vehicle in a couple of minutes."
          />
        ) : (
          <VehicleGrid
            vehicles={topRated.data.items}
            renderAction={(vehicle) => <WishlistButton vehicleId={vehicle.id} />}
          />
        )}
      </section>
    </div>
  );
}
