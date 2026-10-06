# JARMAL Delivery — Master Feature Map
## Scope
This document is for **Jarmal Delivery only**: groceries, restaurants, cafes, clothing, pharmacies and other local stores, with customer, merchant, driver and separate admin portal. The future auto-parts Jarmal project is explicitly out of scope.

## Status legend
- DONE: already implemented and verified
- IMPROVE: exists but needs product/UI refinement
- NEXT: high-priority implementation
- LATER: planned after core stability
- DECISION: requires business rule before implementation

## Customer
- DONE: phone/auth registration
- DONE: customer/merchant/driver roles
- DONE: stores and products
- DONE: cart and order creation
- DONE: COD and electronic-payment flow
- DONE: delivery map pin + address description + notes
- DONE: order lifecycle and cancellation rules
- DONE: favorites
- DONE: reorder foundation
- DONE: order chat foundation
- DONE: ratings/reviews foundation
- NEXT: saved places (home/work/other) using pin + description + landmark
- NEXT: recipient different from account owner
- NEXT: edit order before merchant acceptance
- NEXT: transparent fee breakdown
- NEXT: delivery ETA and status timeline
- NEXT: failed-delivery/retry workflow
- NEXT: returns/refunds lifecycle
- NEXT: support tickets
- NEXT: low-connectivity draft/retry mode
- NEXT: multi-store grouped order with separate fulfillment groups
- NEXT: store pickup UX
- NEXT: request unavailable item / اطلبها لي
- NEXT: coupons/offers
- LATER: photo-based product search
- LATER: AI assistant / Jarmal Companion

## Merchant
- DONE: store registration with pending approval
- DONE: admin store approval/rejection/suspension
- DONE: open/closed gating
- DONE: products
- DONE: inventory foundation
- DONE: staff/member foundation
- DONE: merchant wallet and withdrawal
- DONE: order response/status flow
- NEXT: dashboard KPIs
- NEXT: low-stock alerts
- NEXT: purchase/stock-in records
- NEXT: damaged/lost stock
- NEXT: store hours and temporary closure reason
- NEXT: delivery zones
- NEXT: coupons/offers
- NEXT: invoices
- NEXT: returns/refunds workflow
- LATER: wholesale mode
- LATER: supplier management

## Driver
- DONE: driver access-code onboarding
- DONE: verification workflow
- DONE: availability gating
- DONE: order acceptance/status flow
- DONE: customer location
- DONE: driver wallet top-up/withdrawal foundation
- DONE: cash collection/settlement foundation
- DONE: earnings foundation
- NEXT: daily earnings dashboard
- NEXT: cash liability dashboard
- NEXT: document expiry reminders
- NEXT: delivery retry/failure workflow
- NEXT: support/training center
- NEXT: incentive/bonus rules
- NEXT: delivery zones and vehicle capacity
- LATER: route optimization
- LATER: live tracking when cost/connectivity allow it

## Admin — separate portal
- DONE: isolated /admin entry
- DONE: admin-only authentication gate
- DONE: operations dashboard
- DONE: order operations center
- DONE: store approval
- DONE: driver verification
- DONE: payment methods/settings
- DONE: payment receipt review
- DONE: merchant withdrawals
- DONE: driver cash settlements
- DONE: driver withdrawals
- DONE: driver earning settings
- NEXT: users/permissions matrix
- NEXT: content/CMS
- NEXT: feature flags
- NEXT: notifications center
- NEXT: reports/analytics
- NEXT: support/tickets
- NEXT: audit/activity center
- NEXT: delivery-zone management
- NEXT: coupon/offer manager
- NEXT: JARMAL APP STUDIO
- LATER: JARMAL Companion/Mascot Studio
- LATER: AI operations assistant

## JARMAL Companion
- NEXT: mascot design system
- NEXT: page-aware appearance rules
- NEXT: lightweight animations
- NEXT: contextual help prompts
- NEXT: product/order/store search through existing app data
- NEXT: role-specific behavior for customer/merchant/driver
- LATER: full AI conversation
- LATER: advanced 3D animations if device/network budget allows

## Yemen-specific operating rules
- Address = phone + free-text description + map pin + landmark; no mandatory house/apartment number.
- COD is local/allowed only under configured same-branch rules.
- Electronic payment is required for configured inter-governorate/electronic orders.
- Delivery fees must support zone/distance/custom rules.
- Payment methods must remain admin-configurable.
- Low-connectivity behavior is a first-class requirement.
- Driver cash liability and wallet settlement must remain auditable.

## Safety boundaries
- No arbitrary code execution from visual admin.
- No client-side financial balance mutation.
- No role escalation from client.
- No deleting production data for feature work.
- No changes to main branch during development.
- All schema changes are additive/reversible where possible and verified after migration.

## Explicit separation from Auto Parts Jarmal
Do NOT add vehicle/part-number/OEM/auto-parts catalog behavior to this application. The separate auto-parts product will be designed independently after Jarmal Delivery is completed.
