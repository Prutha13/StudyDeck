# StudyDeck — Stripe Payment & Subscription Setup Guide

This guide walks you through setting up and testing the **StudyDeck Pro** Stripe subscription system in **Test Mode** (zero cost).

---

## 📋 1. Stripe Dashboard Setup (Test Mode)

1. Sign in or register at [https://dashboard.stripe.com](https://dashboard.stripe.com).
2. Ensure **Test mode** is toggled **ON** (top right corner of Stripe Dashboard).

---

## 🔑 2. Obtain Your API Keys

1. Navigate to **Developers → API Keys**.
2. Copy the following keys:
   - **Publishable key**: Starts with `pk_test_...`
   - **Secret key**: Starts with `sk_test_...`
3. Open `server/.env` and add:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   ```

---

## 🏷️ 3. Create StudyDeck Pro Products & Prices

1. In Stripe Dashboard, go to **Product Catalog → Add Product**.
2. **Product Name**: `StudyDeck Pro`
3. **Description**: `AI Personal Learning Coach with unlimited uploads, weakness remediation, and priority models.`
4. **Pricing Plan 1 (Monthly)**:
   - Pricing model: Standard pricing
   - Price: `₹499.00 INR` (or USD equivalent if testing international cards)
   - Billing period: **Monthly** / Recurring
   - Save and copy the **Price ID** (starts with `price_...`).
5. **Pricing Plan 2 (Yearly)**:
   - Click **Add another price** under the same product.
   - Price: `₹4,999.00 INR`
   - Billing period: **Yearly** / Recurring
   - Save and copy the **Price ID** (starts with `price_...`).
6. Add the Price IDs to `server/.env`:
   ```env
   STRIPE_MONTHLY_PRICE_ID=price_...
   STRIPE_YEARLY_PRICE_ID=price_...
   ```
*(Note: If price IDs are omitted during local dev, StudyDeck automatically creates dynamic recurring checkout line-items in test mode).*

---

## 🛠️ 4. Local Webhook Setup (Stripe CLI)

Stripe webhooks are used to grant and synchronize membership securely without trusting frontend states.

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli):
   - **Windows (Scoop)**: `scoop install stripe`
   - **Windows (Direct binary)**: Download `stripe.exe` from GitHub releases.
   - **macOS (Homebrew)**: `brew install stripe/stripe-cli/stripe`
2. Authenticate the CLI:
   ```bash
   stripe login
   ```
3. Start forwarding webhook events to your local server:
   ```bash
   stripe listen --forward-to localhost:5000/api/payment/webhook
   ```
4. The CLI will output a webhook signing secret:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. Copy this `whsec_...` value and paste it into `server/.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
6. Restart your server (`npm run dev` in `server/`).

---

## 🧪 5. Testing Payments with Stripe Test Cards

Use Stripe's official test card numbers during checkout:

| Card Type | Card Number | Expiry | CVC | Postal Code |
|---|---|---|---|---|
| **Success Card** | `4242 4242 4242 4242` | Any future date | Any 3 digits | `12345` / `380001` |
| **Declined Card** | `4000 0000 0000 0002` | Any future date | `123` | `12345` |
| **Authentication Required (3D Secure)** | `4000 0000 0000 3155` | Any future date | `123` | `12345` |

---

## ⚙️ 6. Stripe Customer Billing Portal Setup

1. In Stripe Dashboard, go to **Settings → Customer Portal** ([link](https://dashboard.stripe.com/test/settings/billing/portal)).
2. Toggle **Activate portal**.
3. Under **Subscription management**, allow:
   - Cancel subscriptions (select *Cancel at end of billing cycle*).
   - Update payment methods.
   - View invoice history and receipts.
4. Click **Save changes**.

---

## 🔄 7. Webhook Events Handled by StudyDeck

| Webhook Event | Application Action |
|---|---|
| `checkout.session.completed` | Verifies subscription, updates user's plan to `premium` and status to `active`. |
| `customer.subscription.created` | Synchronizes current billing period start & end dates. |
| `customer.subscription.updated` | Updates renewal dates, cancellation pending states (`cancelAtPeriodEnd`). |
| `customer.subscription.deleted` | Automatically downgrades user to `free` plan upon period expiration. |
| `invoice.paid` | Confirms recurring monthly/yearly renewal payment. |
| `invoice.payment_failed` | Updates subscription status to `past_due` and alerts student. |

---

## 🚀 8. Production Deployment Checklist

1. Toggle Stripe Dashboard to **Live mode**.
2. Replace `sk_test_...` with `sk_live_...` in production environment variables.
3. In Stripe Dashboard **Developers → Webhooks → Add endpoint**:
   - Endpoint URL: `https://your-domain.com/api/payment/webhook`
   - Events to send: Select all `checkout.session.*`, `customer.subscription.*`, `invoice.*`.
   - Copy the live Signing Secret `whsec_...` to your production host env.

