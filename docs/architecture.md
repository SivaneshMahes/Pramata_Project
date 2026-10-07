# Architecture & design decisions

This document explains _why_ the system is shaped the way it is. The README covers _what_ it is.

## 1. Modular monolith, not microservices

One deployable Express API. Inside it, each domain is a module with the same layering:

| Module       | Routes                           | Service(s)                                                                                     | Repository                                |
| ------------ | -------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Auth & users | `auth.routes`, `user.routes`     | `auth.service`, `token.service`, `google.service`                                              | `user.repository`                         |
| Vehicles     | `vehicle.routes`                 | `vehicle.service`                                                                              | `vehicle.repository`                      |
| Availability | (via vehicles, bookings)         | `availability.service`, `bookingRules`                                                         | `booking.repository#overlapFilter`        |
| Bookings     | `booking.routes`, `owner.routes` | `booking.service`, `bookingStateMachine`, `pricing.service`, `coupon.service`, `bookingEvents` | `booking.repository`, `coupon.repository` |
| Reviews      | `review.routes`                  | `review.service`                                                                               | `review.repository`                       |
| Wishlist     | `user.routes`                    | `wishlist.service`                                                                             | `wishlist.repository`                     |
| Uploads      | `upload.routes`                  | `upload.service`                                                                               | — (S3)                                    |
| Invoices     | `booking.routes`                 | `invoice/` (builder → PDF renderer)                                                            | —                                         |
| Dashboard    | `owner.routes`                   | `dashboard.service`                                                                            | aggregations in repositories              |
| Realtime     | Socket.IO                        | `realtime/` subscribes to `bookingEvents`                                                      | —                                         |

Rules that keep the boundaries honest:

- Controllers only parse input (shared Zod schemas), call one service method, and send the envelope.
- Services own business rules, authorization-by-ownership and transactions. They call other services, never other modules' models.
- Repositories are the only code that touches Mongoose. Every query is written with its index in mind.
- Cross-module side effects go through **domain events** (`bookingEvents`): the booking service doesn't know that the audit log or WebSocket notifications exist. Extracting notifications into a separate service later means adding one listener that forwards events to SQS/EventBridge.

Why: one codebase, one pipeline, one thing to debug and explain, and the lowest AWS bill — while keeping seams where a split would happen if scale or team size demanded it.

## 2. Stateless and horizontally scalable

| State               | Where it lives                                                    | Why not in the process                                                                         |
| ------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Identity            | JWT in an httpOnly cookie                                         | Any task can verify it                                                                         |
| Rate-limit counters | MongoDB (`ratelimithits`, TTL)                                    | In-memory counters would multiply the limit by the task count                                  |
| WebSocket fan-out   | Socket.IO **MongoDB adapter** (capped collection + change stream) | A user connected to task B must receive events raised on task A; no Redis needed at this scale |
| Photos              | S3 (browser uploads directly via presigned URL)                   | No local disk; no large bodies through the API                                                 |
| Scheduled job       | Idempotent `updateMany` in every task                             | Safe to run concurrently; no leader election                                                   |

WebSockets use the `websocket` transport only, so the ALB needs no sticky sessions. The server sets `keepAliveTimeout` above the ALB idle timeout (avoids sporadic 502s) and drains on `SIGTERM` (ECS stop) before exiting.

## 3. Booking correctness

### Date semantics

Rental dates are calendar days, transported as `YYYY-MM-DD` and stored as UTC midnight. A booking is the half-open interval `[start, end)`; `totalDays = end − start`. "Today" is computed in one configurable business timezone (`BUSINESS_TIMEZONE`) by a single function, `businessToday()`, which every date rule (and the test suite) uses.

### One availability algorithm

`overlapFilter(start, end)` = `{ status ∈ {PENDING, APPROVED, HANDED_OVER}, startDate < end, endDate > start }`. It is used by:
booking creation (inside the transaction) · `GET /vehicles/:id/availability` · `GET /vehicles?startDate&endDate` (`distinct('vehicle', overlap)` → `$nin`) · `GET /vehicles/:id/calendar` · vehicle deletion. The UI's checks are UX only.

### Concurrency

A naïve "check, then insert" lets two requests both see free dates and both insert. Options considered:

| Approach                                               | Verdict                                                   |
| ------------------------------------------------------ | --------------------------------------------------------- |
| Unique index                                           | Can't express range overlap                               |
| Per-day reservation documents with a unique index      | Works, but multiplies writes and complicates cancellation |
| Distributed lock (Redis)                               | Extra infrastructure and lock-expiry edge cases           |
| **Transaction that first writes the vehicle document** | ✅ chosen                                                 |

`booking.service#create` runs `withTransaction`: `$inc bookingVersion` on the vehicle → overlap query → coupon redemption → insert. Two transactions for the same vehicle write the same document, so MongoDB aborts one with a `WriteConflict` (a `TransientTransactionError`); the driver retries it from the start, it now sees the committed booking and returns `409 BOOKING_CONFLICT`. Bookings for different vehicles never contend. `vehicle.service#remove` takes the same lock before checking for active bookings.

Status changes use compare-and-set (`findOneAndUpdate({ _id, status: from })`), so "approve" and "cancel" racing on the same booking can't both win.

### Pricing

`pricingService.quote(dailyPrice, totalDays, discount?)` is a pure function. The daily price comes from the locked vehicle document, and the booking stores `dailyPrice`, `subtotal`, `discountAmount`, `couponCode`, `totalAmount` — the historical price never changes. Coupon usage is consumed atomically (`usedCount < usageLimit` in the update filter) inside the same transaction.

### State machine

`BOOKING_TRANSITIONS` (in `@vrp/shared-types`) is the single table of legal transitions. The API asserts against it; the UI renders action buttons from it. Time-based guards (approve before start, hand over from start, cancel before start) live in the booking service next to the transition.

## 4. Data model notes

- **Denormalised `owner` on bookings** so owner dashboards and lists never join through vehicles.
- **Soft-deleted vehicles** keep bookings, invoices and reviews valid; the registration-number unique index is _partial_ (`isDeleted: false`) so a deleted listing frees its number.
- **Search-as-you-type** uses edge n-gram `searchTokens` (multikey index) instead of an unanchored regex scan; location filtering uses an anchored prefix on a lower-cased field.
- **Ratings** are recomputed by aggregation inside the review transaction; concurrent reviews of one vehicle conflict on the vehicle document and retry, so the average can't lose an update.
- **No unbounded queries:** list endpoints cap `limit` at 50; id lookups are capped (`wishlist ids` 500, calendar 400 days); populations are single `$in` queries; "has review?" flags for a page are one batched query.

## 5. Frontend

- **Server state** in TanStack Query with hierarchical keys (`['bookings', …]`) so a mutation invalidates exactly what it affects; `keepPreviousData` keeps lists on screen (dimmed) while the next page loads — no layout jumps.
- **URL as state** for browse filters, booking tabs and selected rental dates: shareable, back-button friendly, survives sign-in redirects.
- **Forms** use React Hook Form with the _same_ Zod schemas as the API; validation is inline (on blur, then on change), and server-side field errors are mapped back onto inputs.
- **Design system** primitives (Button, Input/Select/Textarea, Field, Modal, ConfirmDialog, Toast, Badge, Card, Skeleton, EmptyState, ErrorState, SegmentedControl, Switch, Pagination, StarRating) with one accent colour and neutral tokens.

### Motion and interaction (Apple design principles, applied with restraint)

| Principle                                     | Where it shows up                                                                                                                                                                                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Respond on press, instantly                   | `.pressable` scales to 0.97 on `:active` (100 ms); no artificial delays; debouncing applies only to network requests, never to input                                                                                                                            |
| Interruptible, critically damped springs      | Modal, toasts, menus and the segmented-control indicator use springs with `bounce: 0`; springs start from the on-screen value so they can be reversed mid-flight                                                                                                |
| Spatial consistency                           | Sheets rise from and return to the bottom edge; the account menu grows from its trigger (`transform-origin: top right`); toasts enter and leave along the same path                                                                                             |
| Direct manipulation                           | Gallery is a native scroll-snap carousel — 1:1 tracking and platform momentum on touch                                                                                                                                                                          |
| Materials & depth                             | Translucent sticky navigation (`backdrop-filter`) that content scrolls beneath; scrim only for blocking dialogs                                                                                                                                                 |
| Typography                                    | System font stack; negative tracking on large headings, neutral on body; weight for emphasis; tabular figures only in columns                                                                                                                                   |
| Feedback (status, completion, warning, error) | Skeletons shaped like content, toasts for completion, inline field errors, confirmation dialogs reserved for destructive actions                                                                                                                                |
| Accessibility                                 | `MotionConfig reducedMotion="user"` drops transforms; CSS honours `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast`; focus trapping and restoration in dialogs; labelled controls; live regions for results and toasts; skip link |

## 6. Observability

Structured JSON logs (pino) with request IDs (`x-request-id` honoured or generated), redaction of credentials, one audit line per booking lifecycle event (`event: booking.*`). CloudWatch turns `level >= 50` lines into an `ApplicationErrors` metric and `booking.created` lines into a business metric; alarms and a dashboard are defined in Terraform.

## 7. What would change at larger scale

- Add ElastiCache (Redis) for caching hot vehicle lists and as the Socket.IO adapter.
- Move notifications/emails behind SQS consumers; publish booking events to EventBridge.
- Atlas Search for richer discovery; read preference `secondaryPreferred` for browse queries.
- Run scheduled jobs as EventBridge-scheduled ECS tasks; add WAF.
