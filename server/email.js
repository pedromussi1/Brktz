const nodemailer = require('nodemailer');

let transporter;
let smtpVerified = false;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('SMTP not configured — email verification will be skipped');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });

  return transporter;
}

function isSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
}

async function sendVerificationEmail(to, code) {
  const transport = getTransporter();

  const html = `
    <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:2rem;background:#1a1a2e;color:#fff;border-radius:12px">
      <h2 style="text-align:center;margin-bottom:0.5rem">Brktz Verification</h2>
      <p style="text-align:center;color:#a0a0b0;font-size:0.9rem">Enter this code to verify your identity:</p>
      <div style="text-align:center;font-size:2rem;font-weight:700;letter-spacing:0.3em;background:#2a2a4a;padding:1rem;border-radius:8px;margin:1.5rem 0;color:#3b82f6">${code}</div>
      <p style="text-align:center;color:#a0a0b0;font-size:0.8rem">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
    </div>
  `;

  if (!transport) {
    console.log(`\n📧 VERIFICATION CODE for ${to}: ${code}\n`);
    return;
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: 'Your Brktz Verification Code',
      html,
    });
    console.log(`✅ Verification email sent to ${to}`);
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
    // Log the code to console as fallback
    console.log(`📧 FALLBACK — VERIFICATION CODE for ${to}: ${code}`);
    throw new Error('Failed to send verification email. Please check SMTP configuration.');
  }
}

module.exports = { generateCode, sendVerificationEmail, isSmtpConfigured };
