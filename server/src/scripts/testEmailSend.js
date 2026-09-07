import 'dotenv/config';
import nodemailer from 'nodemailer';

async function main() {
  const targetEmail = process.argv[2] || 'proxy.test@studydeck.test';

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const fromAddress = process.env.SMTP_FROM || `"StudyDeck" <${user || 'no-reply@studydeck.app'}>`;

  console.log('=== SMTP Configuration Info ===');
  console.log('Host:', host);
  console.log('Port:', port);
  console.log('Secure:', secure);
  console.log('User configured:', user ? `Yes (${user})` : 'No');
  console.log('Pass configured:', pass ? 'Yes (hidden)' : 'No');
  console.log('From Address:', fromAddress);
  console.log('Target Recipient:', targetEmail);
  console.log('================================\n');

  if (!host || !user || !pass) {
    console.error('ERROR: Incomplete SMTP configuration. Host, user, or pass is missing.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  console.log('--- Step 1: Verifying Transporter Connection (transporter.verify()) ---');
  try {
    const verifyResult = await transporter.verify();
    console.log('transporter.verify() SUCCESS:', verifyResult);
  } catch (err) {
    console.error('transporter.verify() FAILED:', {
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
      stack: err.stack
    });
    process.exit(1);
  }

  console.log('\n--- Step 2: Sending Test Email (transporter.sendMail()) ---');
  const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const mailOptions = {
    from: fromAddress,
    to: targetEmail,
    subject: `Test Verification Code: ${testOtp}`,
    text: `Your test verification code is ${testOtp}.`,
    html: `<b>Your test verification code is: ${testOtp}</b>`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('sendMail() SUCCESS! Full response object:');
    console.dir(info, { depth: null });

    console.log('\n--- Key Nodemailer Fields ---');
    console.log('messageId:', info.messageId);
    console.log('accepted:', info.accepted);
    console.log('rejected:', info.rejected);
    console.log('pending:', info.pending);
    console.log('response:', info.response);
    console.log('envelope:', info.envelope);
  } catch (err) {
    console.error('sendMail() FAILED:', {
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
      stack: err.stack
    });
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected failure in testEmailSend:', err);
  process.exit(1);
});

