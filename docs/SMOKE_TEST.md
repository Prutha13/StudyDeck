# 🧪 StudyDeck Post-Deployment Smoke Test Checklist

Use this step-by-step checklist to manually verify all critical user flows on a newly deployed production or staging environment. Each step includes the exact user action and its expected result.

---

### Pre-requisites
- [ ] Server service is deployed and running (e.g. on Render, Railway, or Fly.io).
- [ ] Client static build is deployed (e.g. on Vercel or Netlify).
- [ ] MongoDB Atlas cluster is active with network access open to `0.0.0.0/0`.
- [ ] Environment variables configured in hosting dashboards (refer to `docs/DEPLOYMENT.md`).

---

### Smoke Test Flow

#### 1. API Health Check
- **Action**: In browser or curl, navigate to `GET https://your-api-domain.com/api/health`
- **Expected Result**: HTTP `200 OK` with JSON `{ "ok": true }`.

#### 2. User Registration & Email OTP Dispatch
- **Action**: Navigate to `https://your-client-domain.com/register`. Enter a new email (`testuser@example.com`) and password (8+ characters), then click **Create Account**.
- **Expected Result**:
  - User is not logged in immediately.
  - UI seamlessly transitions to the **Verify Email** screen (`/verify-otp`).
  - If SMTP is configured: A 6-digit OTP email arrives in your inbox with subject `"Your StudyDeck Verification Code: XXXXXX"`.
  - If SMTP is omitted (local/dev): The 6-digit OTP is logged to the server stdout.

#### 3. Email Verification (OTP)
- **Action**: Enter the 6-digit verification code into the input boxes and submit.
- **Expected Result**:
  - HTTP `200 OK` response.
  - Auth token is saved to localStorage.
  - User is redirected to `/dashboard`.
  - User profile in database reflects `isVerified: true`.

#### 4. Unverified Login Guard (Negative Test)
- **Action**: If an account is created with `isVerified: false` (e.g. before entering OTP), try logging in at `/login`.
- **Expected Result**:
  - Login is blocked with HTTP `403 Forbidden`: *"Please verify your email before logging in."*
  - User is automatically prompted or redirected to enter their verification code.

#### 5. Authenticated Login
- **Action**: Log out and log back in at `/login` with the verified credentials.
- **Expected Result**: Successful redirect to `/dashboard` with email displayed in the sidebar.

#### 6. Document Upload & Text Extraction
- **Action**: On `/dashboard`, click **Upload Document** (or drag and drop a PDF, DOCX, or paste text notes, e.g. 500+ words of educational text) and click **Analyze Notes**.
- **Expected Result**:
  - Request is accepted with HTTP `202 Accepted`.
  - Document appears in the list with a `"processing"` spinner badge.
  - User usage counter increments (`usage.documentsThisMonth: 1`).

#### 7. Real-Time Status via Server-Sent Events (SSE)
- **Action**: Click on the processing document to view `/documents/:id`.
- **Expected Result**:
  - Network tab shows an active EventSource stream to `/api/documents/:id/events`.
  - UI stage indicators transition in real-time: `analyzing` → `saving` → `done`.
  - The page dynamically updates without requiring a manual browser reload.

#### 8. Summary, Action Items & Flashcards Display
- **Action**: Once processing finishes (`status: "done"`), inspect the document detail tabs.
- **Expected Result**:
  - **Summary**: Concise bullet points and core takeaways rendered cleanly.
  - **Action Items**: Key study objectives listed.
  - **Flashcards**: Interactive flip cards appear with question fronts and conceptual answers on the back.

#### 9. Take a Practice Quiz
- **Action**: Switch to the **Quiz** tab and answer the generated multiple-choice questions. Submit the quiz.
- **Expected Result**:
  - Options are randomized (correct answer is NOT always option A).
  - Score is calculated and displayed.
  - A `QuizAttempt` record is created in MongoDB.
  - If questions were answered incorrectly, mistake records are registered in the background.

#### 10. Knowledge Map & Topic Mastery
- **Action**: Navigate to **Knowledge Map** in the sidebar (`/knowledge-map`).
- **Expected Result**:
  - Extracted subject and topics from the uploaded document appear.
  - Mastery percentages reflect quiz performance.
  - Clicking a concept shows its status (`struggling`, `learning`, or `mastered`).

#### 11. Mistake Book Remediation
- **Action**: Navigate to **Mistake Book** in the sidebar (`/mistake-book`).
- **Expected Result**:
  - Any questions answered incorrectly in Step 9 appear in the list.
  - Stat cards at top ("Total Recorded", "Needs Revision") match the list length.
  - If on Free plan, clicking **Fix My Weakness** displays the upgrade prompt modal.

#### 12. Daily Spaced Review Queue
- **Action**: Navigate to **Daily Review** in the sidebar (`/daily-review`).
- **Expected Result**:
  - Queued review items appear based on SRS intervals.
  - Options have randomized positions and test real conceptual definitions (no meta-statements or generic boilerplate).

#### 13. Stripe Subscription Checkout (Test Mode)
- **Action**: Navigate to **Pricing** or **Billing** (`/pricing` or `/settings/billing`) and select **Upgrade to Pro** (Monthly or Yearly).
- **Expected Result**:
  - Backend creates a Stripe Checkout session.
  - Browser redirects to Stripe-hosted Checkout page (`checkout.stripe.com`).
  - Use Stripe test card `4242 4242 4242 4242` (any future date, any 3-digit CVC).
  - On completion, redirects to `/payment/success?session_id=...`.
  - Within seconds, webhook updates `User.subscription.plan` to `"premium"` and `status` to `"active"`.
  - Sidebar and billing page display the **Pro** badge.

#### 14. Customer Billing Portal & Cancellation
- **Action**: As a Pro user, click **Manage Subscription** on `/settings/billing`.
- **Expected Result**:
  - Browser redirects to Stripe Customer Portal.
  - Cancel subscription in portal.
  - Redirects back to StudyDeck.
  - `cancelAtPeriodEnd` updates to `true` while retaining Pro access until the period ends.

