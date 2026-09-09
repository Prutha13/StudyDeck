const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER = { name: 'StudyDeck', email: 'pruthathakor13@gmail.com' };

let latestTestOtp = null;

/**
 * Helper for test suites to inspect the latest generated OTP.
 */
export function _getLatestTestOtp() {
  return latestTestOtp;
}

/**
 * Internal helper: send an email via Brevo's transactional email API.
 */
async function sendViaBrevo({ to, subject, text, html }) {
  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY || '',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || `Brevo API returned status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

/**
 * Send welcome / transactional notification email via Brevo API.
 */
export async function sendWelcomeEmail({ to }) {
  if (!to) return;
  const normalizedEmail = to.trim().toLowerCase();

  try {
    const data = await sendViaBrevo({
      to: normalizedEmail,
      subject: 'Welcome to StudyDeck!',
      text: 'Welcome to StudyDeck! Start transforming your lecture notes into instant summaries and study decks.',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #0d1117; color: #e6edf3; border-radius: 16px; border: 1px solid #30363d;">
          <div style="text-align: center; margin-bottom: 28px;">
            <h1 style="font-size: 22px; font-weight: 700; color: #ffffff;">Welcome to StudyDeck!</h1>
            <p style="font-size: 13px; color: #8b949e;">Your AI workspace is ready.</p>
          </div>
        </div>
      `
    });

    return { success: true, data };
  } catch (err) {
    console.warn(`[EmailService] Failed to send welcome email to ${normalizedEmail}:`, err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Send OTP verification code email via Brevo API.
 */
export async function sendOtpEmail({ to, otp }) {
  if (!to || !otp) return;
  const normalizedEmail = to.trim().toLowerCase();
  latestTestOtp = otp;

  try {
    const data = await sendViaBrevo({
      to: normalizedEmail,
      subject: `Your StudyDeck Verification Code: ${otp}`,
      text: `Your verification code is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #0d1117; color: #e6edf3; border-radius: 16px; border: 1px solid #30363d;">
          <div style="text-align: center; margin-bottom: 28px;">
            <h1 style="font-size: 22px; font-weight: 700; color: #ffffff;">Verify Your Email</h1>
            <p style="font-size: 14px; color: #8b949e;">Use the code below to complete your StudyDeck registration:</p>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #58a6ff; margin: 24px 0; background: #161b22; padding: 16px; border-radius: 8px; border: 1px solid #30363d;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #8b949e;">This code will expire in 10 minutes.</p>
          </div>
        </div>
      `
    });

    return { success: true, data };
  } catch (err) {
    console.error(`[EmailService] Failed to send OTP email to ${normalizedEmail}:`, err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}