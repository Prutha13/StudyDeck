import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

// In-memory test store for automated testing only (never logs plaintext, never writes to DB)
const testOtpStore = new Map();

export function _getLatestTestOtp(email) {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return testOtpStore.get(email?.toLowerCase());
  }
  return null;
}

/**
 * Send an email-based OTP verification code to a user via Resend API.
 * Plaintext OTP is NEVER stored in database or logged in plaintext.
 *
 * Supports both object params: sendOtpEmail({ to, otp })
 * and positional params: sendOtpEmail(toEmail, otpCode)
 */
export async function sendOtpEmail(toEmail, otpCode) {
  let to = toEmail;
  let otp = otpCode;

  if (typeof toEmail === 'object' && toEmail !== null) {
    to = toEmail.to || toEmail.email || toEmail.toEmail;
    otp = toEmail.otp || toEmail.otpCode || toEmail.code;
  }

  if (!to || !otp) {
    throw new Error('Recipient email and OTP code are required');
  }

  const normalizedEmail = to.trim().toLowerCase();

  // In test / dev environments, store temporarily in-memory for testing verification
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    testOtpStore.set(normalizedEmail, otp);
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'StudyDeck <onboarding@resend.dev>',
      to: normalizedEmail,
      subject: `Your StudyDeck Verification Code: ${otp}`,
      text: `Your StudyDeck verification code is: ${otp}. This code will expire in 10 minutes. If you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #0d1117; color: #e6edf3; border-radius: 16px; border: 1px solid #30363d;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); padding: 1px;">
              <div style="width: 100%; height: 100%; background: #0d1117; border-radius: 11px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 22px; line-height: 44px;">📚</span>
              </div>
            </div>
            <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 12px 0 4px 0; letter-spacing: -0.5px;">StudyDeck Verification</h1>
            <p style="font-size: 13px; color: #8b949e; margin: 0;">Confirm your email address to get started</p>
          </div>

          <div style="background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #8b949e; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Verification Code</p>
            <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #f59e0b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin: 8px 0;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #8b949e; margin: 12px 0 0 0;">Valid for <strong>10 minutes</strong></p>
          </div>

          <p style="font-size: 12px; color: #8b949e; line-height: 1.6; margin: 0 0 8px 0;">
            Enter this code in StudyDeck to verify your account and access your AI study tools, interactive flashcards, and knowledge maps.
          </p>
          <p style="font-size: 11px; color: #484f58; margin: 16px 0 0 0; border-top: 1px solid #21262d; padding-top: 12px;">
            If you did not create a StudyDeck account, you can safely disregard this email.
          </p>
        </div>
      `
    });

    if (error) {
      console.error(`[EmailService] Resend API error sending email to ${normalizedEmail}:`, error);
      throw new Error(error.message || 'Failed to send verification email via Resend');
    }

    console.log(`[EmailService] OTP email dispatched to ${normalizedEmail} via Resend. ID:`, data?.id);
    return { success: true, data };
  } catch (err) {
    console.error(`[EmailService] Failed to send OTP email to ${normalizedEmail}:`, err);
    throw err;
  }
}
