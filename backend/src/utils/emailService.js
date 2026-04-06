let nodemailer = null;

try {
  // Lazy optional dependency. If not installed, notifications are logged instead.
  nodemailer = require("nodemailer");
} catch (error) {
  nodemailer = null;
}

function getTransporter() {
  if (!nodemailer) {
    return null;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendEmail({ to, subject, text, html, from, replyTo }) {
  const transporter = getTransporter();

  if (!transporter) {
    // Fallback for local/dev when SMTP is not configured.
    console.log(`[EMAIL-FALLBACK] to=${to} subject=${subject} text=${text}`);
    return { sent: false, fallback: true };
  }

  await transporter.sendMail({
    from: from || process.env.SMTP_FROM || process.env.SMTP_USER,
    replyTo,
    to,
    subject,
    text,
    html,
  });

  return { sent: true, fallback: false };
}

module.exports = { sendEmail };