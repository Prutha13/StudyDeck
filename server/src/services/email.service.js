import nodemailer from 'nodemailer';

let latestTestOtp = null;

/**
 * Helper for test suites to inspect the latest generated OTP.
 */
export function _getLatestTestOtp() {
  return latestTestOtp;
}

/**
 * Internal helper: send an email via Nodemailer using Gmail SMTP.
 */
async function sendMail({ to, subject, text, html }) {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER || 'pruthathakor13@gmail.com';
  const pass = process.env.GMAIL_APP_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASS || '';

  if (!pass) {
    console.warn(`[EmailService] GMAIL_APP_PASS is not configured in environment. OTP logged for dev testing.`);
    return { id: 'simulated-dev-mode' };
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true'; // false for port 587

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: true,
    auth: {
      user,
      pass
    },
    family: 4, // Force IPv4 to prevent IPv6 connection timeouts on cloud hosts
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  });

  const from = `"StudyDeck Verification" <${user}>`;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html
  });

  return info;
}

/**
 * Send welcome / transactional notification email via Nodemailer.
 */
export async function sendWelcomeEmail({ to }) {
  if (!to) return;
  const normalizedEmail = to.trim().toLowerCase();

  try {
    const data = await sendMail({
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
 * Send OTP verification code email via Nodemailer.
 */
export async function sendOtpEmail({ to, otp }) {
  if (!to || !otp) return;
  const normalizedEmail = to.trim().toLowerCase();
  latestTestOtp = otp;

  try {
    const data = await sendMail({
      to: normalizedEmail,
      subject: `${otp} is your StudyDeck verification code`,
      text: `Your verification code is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #0d1117; color: #e6edf3; border-radius: 16px; border: 1px solid #30363d;">
          <div style="text-align: center; margin-bottom: 28px;">
            <h1 style="font-size: 22px; font-weight: 700; color: #ffffff;">Verify Your Email</h1>
            <p style="font-size: 14px; color: #8b949e;">Use the code below to complete your StudyDeck registration:</p>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #58a6ff; margin: 24px 0; background: #161b22; padding: 16px; border-radius: 8px; border: 1px solid #30363d;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #8b949e;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
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