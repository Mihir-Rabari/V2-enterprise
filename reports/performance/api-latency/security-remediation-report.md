# Security and inventory correctness remediation report (S1-S4)

- Branch: `fix/security-correctness-s1-s4` (worktree `K:\Projects\V2-enterprise-security`)
- Baseline: `68984e78b78799f33b06b439b24ee2ee07278ddf` (verified equal to HEAD of the protected tree before starting)
- Status: **S1, S2, S3, S4 implemented and covered by local tests. Nothing committed, pushed or deployed. Staging verification is blocked (no staging, Razorpay test keys or MongoDB available).**
- The protected working tree (`perf/pdp-responsive-images`, 8 modified frontend files + untracked `reports/performance/`) was not touched; its `git status` is identical before and after.

## 1. Findings, root causes, fixes

| ID | Root cause | Fix |
|---|---|---|
| S1 | `getProductByIdService` returned any product by id; only siblings were filtered (exact `'ACTIVE'`, so `'Active'` siblings were dropped). The SPA meta-injection in `app.ts` and the wishlist (`add` + populate) were two further public/customer paths to inactive product data. | Public service returns the same `Product not found.` 404 for inactive (any casing) as for a missing id. Siblings filtered case-insensitively. `includeInactive` option exists only for the new admin route. `app.ts` meta injection and wishlist add/get now require an active product. |
| S2 | `create-order` charged a client-supplied `amount`; order creation only checked the signature, never the paid amount; no replay protection. | New server-side `PaymentIntent` (see 3). Amount is never read from the client. Verification fetches the payment from Razorpay and checks order id, currency, integer paise amount and `captured` status; one atomic claim per intent; unique indexes on `Order.razorpayPaymentId/razorpayOrderId`. |
| S3 | `GET /products?status=ALL` returned a different dataset depending on the `Authorization` header. | Public `GET /products` always uses `ACTIVE` and ignores `status` and the token. New `GET /admin/products` and `GET /admin/products/:id` (`protect` + `adminOnly`, `Cache-Control: private, no-store`, set before auth so 401/403 are also no-store). `resolveListStatus` removed. |
| S4 | Stock decrement used `variants.$.quantity`; the schema has a top-level `quantity` and no `variants`, so nothing was decremented and stock was never checked. | `reserveStock`: atomic `findOneAndUpdate({_id, status active, quantity >= n}, {$inc: {quantity: -n}})` per line, all-or-nothing with compensation. |

## 2. Files changed

Backend (src): `utils/productStatus.ts` (new, shared active-status helper), `modules/products/products.service.ts`, `products.controller.ts`, `modules/admin/admin.routes.ts` (admin product routes), `app.ts` (meta only for active), `modules/wishlist/wishlist.service.ts`, `models/PaymentIntent.ts` (new), `models/Order.ts` (2 partial unique indexes), `modules/orders/pricing.ts` (new, the single pricing function), `modules/orders/inventory.ts` (new, reserve/release), `modules/orders/orders.service.ts` (rewritten create flow), `modules/payments/payments.service.ts`, `payments.controller.ts`.
Frontend (3 small edits, only because the API contract changed): `lib/apiClient.ts` (`adminAPI.getProducts`, new `createRazorpayOrder` signature), `hooks/useAdminData.ts` (admin list uses the admin route), `pages/Checkout.tsx` (sends cart items, not an amount). None of these files overlap the protected tree's uncommitted changes.
Tests: `test/products-visibility.test.ts`, `test/payments-orders.test.ts`, `test/helpers/{env,fakeDb,http}.ts`; `test/audit-fixes.test.ts` loses the obsolete `resolveListStatus` test (function removed; behaviour now covered by route tests).

## 3. Payment design (S2): source of truth for the expected amount

1. `POST /payments/create-order` (auth required) takes `{ items, couponCode? }`. `priceCart` (the same function order creation uses) prices it from DB prices, validated integer quantities, the `prepaid` discount and a validated coupon. Total in paise = `round(total*100)`; must be >= 100.
2. Razorpay order is created with that integer paise amount, `INR`, and a server-generated receipt. A `PaymentIntent {razorpayOrderId, userId, items, amountPaise, currency, status}` is stored. **The intent is the source of truth for the amount, currency, owner and cart.**
3. `POST /orders` (prepaid): validate field formats -> constant-time HMAC check -> atomically claim the intent `CREATED -> PROCESSING` for the same user (only one concurrent/replayed request can) -> `payments.fetch`: `order_id`, `currency`, `amount` (integer paise) must equal the intent and `status === 'captured'` -> re-price the cart now and require the same paise total and same cart as the intent -> reserve stock -> create order -> intent `COMPLETED`.
4. Outcomes: provider unreachable or payment not captured/failed -> intent back to `CREATED` (same Razorpay order can be retried with a new payment). Amount/currency/order mismatch, price/cart change, or insufficient stock after a captured payment -> intent `FAILED` with a reason (needs manual refund/review). A DB failure creating the order -> stock released, intent back to `CREATED`.
5. Replay: a fulfilled `(paymentId, razorpayOrderId, user)` returns the existing order (idempotent, no second order or decrement); other users are rejected; unique partial indexes are the last line of defence.

## 4. API contract changes (review these)

- `POST /payments/create-order`: body is now `{ items:[{productId,quantity,size?,color?}], couponCode? }`. `amount`, `currency`, `receipt` are ignored. Old clients that send only `amount` get **400**. Frontend updated. Response shape (Razorpay order: `id`, `amount`, ...) unchanged.
- `GET /products?status=ALL|INACTIVE` now silently returns ACTIVE only (even with an admin token). Admin UI moved to `GET /admin/products` (default `status=ALL`, accepts the same filters/pagination).
- `GET /products/:id` returns 404 for inactive products (previously 200). `GET /admin/products/:id` added.
- Orders: products with `quantity` 0 (the schema default) can no longer be ordered; `Insufficient stock for "<name>"` is a new 400. **Confirm catalog quantities are populated before release.**
- Orders for products whose status is `'Active'` (mixed case) are now allowed (previously rejected while still publicly listed).
- Wishlist: inactive products are omitted from `GET /wishlist` and cannot be added.
- New collection `paymentintents`; new unique partial indexes on `orders`. Index builds will fail if existing orders contain duplicate non-null `razorpayPaymentId`/`razorpayOrderId`: check first.

## 5. Tests

Commands (all in `backend/`): `npm test`, `npx tsc --noEmit -p .`; in `frontend/`: `npx tsc --noEmit`, `npm run build`.

| Check | Result |
|---|---|
| `npm test` | **43 tests, 43 pass, 0 fail** (baseline before changes: 9/9). New: 9 in products-visibility, 26 in payments-orders. |
| Backend `tsc --noEmit` | clean (0 errors) |
| Frontend `tsc --noEmit` | clean (0 errors) |
| Frontend `vite build` | succeeded (output is gitignored) |
| Mutation check | Removing the S1 status check makes 2 S1 tests fail, confirming the tests can detect the bug. A full baseline run of the new tests was not done. |
| Lint, dependency audit | Not run (no lint script; `npm audit` was not run to avoid contacting a registry from this task). |

Coverage: S1 (active anon, inactive anon/customer/admin-on-public, admin path, missing/malformed ids, inactive siblings); S3 (anon/admin-token/customer/garbage-token public, admin route 401/403/200 + cache header, filters/pagination); S2 (client amount tampering, provider amount under/over, currency mismatch, foreign provider order, invalid/short/missing signature, malformed provider data, replay, other-user replay, concurrent duplicate, failed/authorized payment then retry, provider outage, price change, different cart); S4 (decrement, insufficient, multi-line rollback, concurrent last unit, failure after reservation (COD and prepaid) with single decrement on retry, sold out after payment, malformed quantities, inactive/mixed-case products).

**Important limitation: these are "passed locally against in-memory fakes", not against MongoDB or Razorpay.** `test/helpers/fakeDb.ts` mocks the Mongoose model statics and the Razorpay SDK (no network, no real payments). The "concurrent last unit" test proves the logic issues a guarded conditional update, but real MongoDB atomicity, real index behaviour (duplicate-key on the unique indexes) and real Razorpay payloads were **not** exercised. No `mongod`/`mongodb-memory-server` was available and I did not add a dependency.

## 6. Security properties now enforced

- Public product detail/list/sitemap-adjacent paths (detail, list, siblings, SPA meta, wishlist) never expose non-active products; the response does not depend on the Authorization header.
- Admin product data only via `protect + adminOnly` routes, `private, no-store`.
- Payable amount is derived and stored server-side; a valid signature alone cannot create an order; amount, currency, order binding and capture status are verified against Razorpay; one payment -> at most one order; signature compare is constant-time and format-checked.
- Stock is decremented on the real field with a guard against going below zero; failures release reservations; payment retries cannot double-decrement.

## 7. Staging checks

Completed: none. **Blocked (need staging backend, DB copy, Razorpay test keys, admin + customer accounts):** see section 9 checklist.

## 8. Known limitations and residual risks

1. **No cross-document transaction.** Reserve-stock -> create-order is compensating, not atomic. A process crash after reserving and before `Order.create` leaves stock decremented without an order (and the intent in `PROCESSING`). Mitigation to add if desired: a reconciliation job over `PROCESSING` intents/orders, or Mongo transactions if the deployment is a replica set (not verified; not assumed).
2. **Paid-but-unfulfillable orders** (price changed, stock sold out, mismatch) leave a captured payment with no order; the intent is `FAILED` with a reason and **no automatic refund** is issued. Needs an ops runbook / refund job.
3. `captured` only: if the Razorpay account uses manual capture, successful payments will be reported as not completed until captured. Confirm the account's capture setting on staging.
4. Checkout never sent a coupon, so coupon handling is unchanged; coupon usage is still not decremented anywhere (pre-existing).
5. Order ids are still `#V2-<Date.now()>`; a same-millisecond collision now fails safely (stock released, payment retryable) rather than silently.
6. Pre-existing and out of scope (S5 etc.): categories not filtered by status, write-on-read in filters, 500 MB body limit, meta HTML escaping, `razorpay_key` hard-coded fallback in `Checkout.tsx`. `Order.create` also still stores the client `size/color` as informational values.
7. `payments.fetch` adds one Razorpay API call to order placement (latency, and an availability dependency; outage fails closed and is retryable).

## 9. Staging verification checklist (never run against production)

- [ ] Active product 200; INACTIVE and `Inactive` product 404 anon, customer, admin-on-public; admin `GET /admin/products/:id` 200.
- [ ] `GET /products?status=ALL` anon vs with admin token: byte-identical bodies; `/admin/products` 401 anon / 403 customer / 200 admin with `Cache-Control: private, no-store`; admin UI product table and edit still work.
- [ ] create-order with tampered `amount` -> Razorpay order amount equals server total; legacy amount-only body -> 400.
- [ ] Pay with Razorpay test card: order created, stock decremented once; paid amount mismatch cannot be produced from the UI, so craft it by creating an order for cart A and verifying with cart B (expect rejection + FAILED intent).
- [ ] Replay the same `razorpay_*` triplet: same order returned, stock unchanged; replay as another user rejected.
- [ ] Failed test payment (Razorpay failure card) then successful retry on the same Razorpay order.
- [ ] Concurrency: N parallel orders for a product with quantity 1 (real Mongo): exactly one success, `quantity` ends at 0.
- [ ] Failure recovery: kill the app between reserve and create (or inject failure) and check intent/stock state; confirm what the reconciliation process must handle.
- [ ] Unique indexes built successfully on the staging DB copy (no duplicate payment ids); `paymentintents` collection created.
- [ ] COD and pickup checkout regression; coupon path; quantity-0 SKUs; mixed-case `Active` products.
- [ ] Response headers: public `/products*` carry no `Vary: Authorization`; admin routes `private, no-store`; no payment/secret values in logs.
- [ ] Confirm Razorpay capture mode (auto vs manual).

## 10. Reviewer approval checklist before deployment

- [ ] API contract changes in section 4 accepted (esp. create-order body and 404 for inactive products).
- [ ] Decision on refund/reconciliation process for `FAILED` / stuck `PROCESSING` intents.
- [ ] Production catalog quantities verified (no accidental 0-stock SKUs that must stay buyable).
- [ ] Pre-deploy duplicate check for `orders.razorpayPaymentId` / `razorpayOrderId` before the unique indexes build.
- [ ] Staging checklist (section 9) executed and signed off, including real-Mongo concurrency.
- [ ] Frontend and backend deployed together (old frontend cannot create prepaid orders; old admin UI would show only active products).
- [ ] Merge plan: Checkout.tsx / apiClient.ts / useAdminData.ts edits do not overlap the uncommitted frontend work on `perf/pdp-responsive-images` as of this task, re-check at merge.
