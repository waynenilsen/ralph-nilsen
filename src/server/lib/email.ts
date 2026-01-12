import { createTransport, type Transporter } from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "localhost";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "1025", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "noreply@todoapp.local";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:40000";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth:
        SMTP_USER && SMTP_PASS
          ? {
              user: SMTP_USER,
              pass: SMTP_PASS,
            }
          : undefined,
    });
  }
  return transporter;
}

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transport = getTransporter();
  await transport.sendMail({
    from: SMTP_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export async function sendWelcomeEmail(email: string, username: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Welcome to Todo App!",
    text: `Hi ${username},

Welcome to Todo App! Your account has been created successfully.

You can start organizing your tasks right away by logging in at:
${APP_URL}/signin

Best regards,
The Todo App Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb;">Welcome to Todo App!</h1>
  <p>Hi ${username},</p>
  <p>Your account has been created successfully.</p>
  <p>You can start organizing your tasks right away by logging in:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${APP_URL}/signin" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Sign In</a>
  </p>
  <p>Best regards,<br>The Todo App Team</p>
</body>
</html>`,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  username: string,
  token: string
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password/${token}`;

  await sendEmail({
    to: email,
    subject: "Reset Your Password - Todo App",
    text: `Hi ${username},

We received a request to reset your password. Click the link below to reset it:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
The Todo App Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb;">Reset Your Password</h1>
  <p>Hi ${username},</p>
  <p>We received a request to reset your password. Click the button below to reset it:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
  </p>
  <p style="font-size: 14px; color: #666;">This link will expire in 1 hour.</p>
  <p style="font-size: 14px; color: #666;">If you didn't request a password reset, you can safely ignore this email.</p>
  <p>Best regards,<br>The Todo App Team</p>
</body>
</html>`,
  });
}
