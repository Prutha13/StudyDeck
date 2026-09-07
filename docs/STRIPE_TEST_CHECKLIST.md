# 💳 Stripe Test Mode Verification Checklist

Follow these steps with your Stripe test credentials configured to verify subscription management end-to-end.

---

### Step 1: Pre-requisites & Key Setup
1. In `server/.env` (or hosting environment variables), configure:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_PUBLISHABLE_KEY=pk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - (Optional) `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_YEARLY_PRICE_ID`
2. If testing locally, launch the Stripe CLI to forward webhook events to your local server:
   ```bash
   stripe listen --forward-to localhost:5000/api/payment/webhook
   ```
   (Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`).

---

### Step 2: Create Checkout Session
1. Log in to StudyDeck with a test account on the Free tier.
2. Navigate to **Pricing** (`/pricing`) or **Billing** (`/settings/billing`).
3. Click **Upgrade to Pro** for either the Monthly or Yearly plan.
4. **Verification**: Confirm you are redirected to the official Stripe-hosted checkout page (`checkout.stripe.com`) with the correct price and plan description displayed.

---

### Step 3: Complete Test Card Payment
1. On the Stripe Checkout page, enter:
   - **Card Number**: `4242 4242 4242 4242`
   - **Expiration**: Any future date (e.g. `12/34`)
   - **CVC**: Any 3 digits (e.g. `123`)
   - **Name on Card**: Any name
   - **Billing Address**: Any valid country/zip
2. Click **Subscribe**.
3. **Verification**: Confirm Stripe redirects back to StudyDeck:
   `https://<client-origin>/payment/success?session_id=cs_test_...`

---

### Step 4: Verify Webhook Processing & Plan Upgrade
1. Check backend logs:
   - Look for `[STRIPE WEBHOOK] Received event: checkout.session.completed`
   - Look for `[STRIPE SYNC] Updated user <id> subscription: plan=premium, status=active`
2. In StudyDeck UI:
   - Refresh `/dashboard` or navigate to `/settings/billing`.
   - **Verification**:
     - User badge shows **Pro** / **Premium**.
     - Monthly document upload limit shows unlimited (500/mo).
     - **Fix My Weakness** remediation feature is unlocked and accessible.

---

### Step 5: Customer Portal & Subscription Cancellation
1. Navigate to `/settings/billing`.
2. Click **Manage Subscription** (Billing Portal).
3. **Verification**: Confirm you are redirected to the Stripe Customer Portal.
4. Click **Cancel subscription** > confirm cancellation at period end.
5. Click the return link to redirect back to StudyDeck (`/settings/billing`).
6. **Verification**:
   - Backend logs show `customer.subscription.updated` event.
   - User document in database updates `cancelAtPeriodEnd: true`.
   - User retains Pro access until the current billing cycle expires.

---

### Step 6: Payment Failure Handling (Negative Test)
1. In Stripe Dashboard under **Billing** > **Subscriptions**, find the test subscription.
2. Trigger an invoice payment failure (or use a test card that fails with `card_declined`).
3. **Verification**:
   - Webhook `invoice.payment_failed` is processed.
   - Backend sets `user.subscription.status = 'past_due'`.

