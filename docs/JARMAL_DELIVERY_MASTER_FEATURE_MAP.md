# JARMAL Delivery — Master Feature Map
## Scope
This map belongs only to the current JARMAL delivery app. The future automotive-parts app is a separate project and must never be mixed into this codebase.

## Status
- Authentication / OTP: COMPLETE
- Customer / merchant / driver roles: COMPLETE
- Separate admin portal: COMPLETE
- Store approval workflow: COMPLETE
- Driver verification workflow: COMPLETE
- Customer delivery map pin: COMPLETE
- Driver customer location: COMPLETE
- COD rules: COMPLETE
- Electronic payment receipt workflow: COMPLETE
- Merchant wallet + withdrawals: COMPLETE
- Driver wallet + top-up/withdrawal: COMPLETE
- Driver cash collection + settlement: COMPLETE
- Driver earning settings: COMPLETE
- Auto-parts-only schema: REMOVED FROM DELIVERY APP

## Delivery product priorities
### P0 — protect and stabilize
- Build must remain green on redesign-jarmal.
- Never modify main directly.
- Preserve existing data and RPC contracts.
- Keep financial actions behind secure RPCs.
- Keep admin isolated from customer/merchant/driver UI.
- Keep approved-store filtering enforced server-side.

### P1 — core delivery experience
- Saved delivery places: Home / Work / Other.
- Recipient can differ from account owner.
- Order status event/history timeline.
- Delivery retry / failed-delivery reason.
- Store pickup.
- Clear fee breakdown before confirmation.
- Order editing only before merchant acceptance.
- Customer cancellation rules with reason.
- Order-linked chat with driver during active delivery.
- Ratings for merchant and driver.
- Support ticket / help flow.
- Notification center and notification preferences.
- Low-connectivity resilience: retry, draft preservation, lightweight states.

### P1 — merchant
- Store hours and temporary closure.
- Delivery zones and zone fees.
- Inventory thresholds.
- Stock-in / stock-out / damaged / lost movements.
- Employee roles and permissions.
- Merchant order preparation timers.
- Merchant analytics.
- Coupons and store offers.

### P1 — driver
- Earnings dashboard.
- Cash liability dashboard.
- Settlement history.
- Document expiry reminders.
- Delivery zone assignment.
- Vehicle type/capacity.
- Incentives/bonuses.
- Failed-delivery workflow.
- Support/training center.

### P1 — admin
- Operations center.
- Store/driver approvals.
- Payment receipt review.
- Wallet and withdrawal controls.
- Delivery fee rules.
- Feature flags.
- Notification composer.
- Content/CMS.
- Audit log.
- Role/permission matrix.
- Reports and analytics.

### P2 — growth
- Multi-store grouped orders with separate fulfillment groups.
- Coupons / promo codes.
- Referral system.
- Jarmal jewels.
- Ads and sponsored placements.
- Gift orders.
- Reorder.
- Favorites.
- Scheduled orders.
- Store pickup.
- Supplier/shipping integrations.

### P2 — assistant
- JARMAL Companion mascot.
- Context-aware help by page and role.
- Search products/stores/orders through safe application tools.
- Guided actions instead of unrestricted account changes.
- Animated mascot system with lightweight assets.
- Admin-controlled mascot appearance, messages and frequency.
- Draft / preview / publish controls in JARMAL App Studio.

### P3 — advanced
- Smart courier assignment.
- Route optimization.
- Live tracking when infrastructure/cost allows.
- AI recommendations.
- Voice assistant.
- Image understanding for general products.
- Advanced demand forecasting.

## Yemen-specific rules
- Address = phone + free-text description + landmark + optional map pin.
- Do not require house/apartment numbers.
- Payment methods are configurable by branch/order context.
- COD is limited by the current branch/business rules.
- Electronic payment is required where COD is not allowed.
- Delivery pricing must support branch/zone/custom rules.
- Design and network behavior must work on low bandwidth.

## Automotive boundary
No vehicle_make, vehicle_model, part_number, automotive catalog, automotive supplier, or automotive-specific search belongs in this delivery project. Those belong to the separate future JARMAL automotive project.
