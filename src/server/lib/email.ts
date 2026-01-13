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

export async function sendInvitationEmail(params: {
  email: string;
  organizationName: string;
  inviterName: string;
  role: string;
  token: string;
}): Promise<void> {
  const { email, organizationName, inviterName, role, token } = params;
  const inviteUrl = `${APP_URL}/invite/${token}`;

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${organizationName}`,
    text: `Hi,

${inviterName} has invited you to join ${organizationName} as a ${role}.

Click the link below to accept this invitation:

${inviteUrl}

This invitation will expire in 7 days.

If you don't want to join this organization, you can safely ignore this email.

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
  <h1 style="color: #2563eb;">You're Invited!</h1>
  <p>Hi,</p>
  <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
  </p>
  <p style="font-size: 14px; color: #666;">This invitation will expire in 7 days.</p>
  <p style="font-size: 14px; color: #666;">If you don't want to join this organization, you can safely ignore this email.</p>
  <p>Best regards,<br>The Todo App Team</p>
</body>
</html>`,
  });
}

export async function sendInvitationAcceptedEmail(params: {
  inviterEmail: string;
  newMemberName: string;
  newMemberEmail: string;
  organizationName: string;
}): Promise<void> {
  const { inviterEmail, newMemberName, newMemberEmail, organizationName } = params;

  await sendEmail({
    to: inviterEmail,
    subject: `${newMemberName} has joined ${organizationName}`,
    text: `Hi,

Great news! ${newMemberName} (${newMemberEmail}) has accepted your invitation and joined ${organizationName}.

They now have access to the organization and can start collaborating.

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
  <h1 style="color: #2563eb;">New Team Member!</h1>
  <p>Hi,</p>
  <p>Great news! <strong>${newMemberName}</strong> (${newMemberEmail}) has accepted your invitation and joined <strong>${organizationName}</strong>.</p>
  <p>They now have access to the organization and can start collaborating.</p>
  <p>Best regards,<br>The Todo App Team</p>
</body>
</html>`,
  });
}

export async function sendAssignmentEmail(params: {
  assigneeEmail: string;
  assigneeName: string;
  todoId: string;
  todoTitle: string;
  todoDescription: string | null;
  todoPriority: "low" | "medium" | "high";
  todoDueDate: Date | null;
  assignerName: string;
  organizationName: string;
}): Promise<void> {
  const {
    assigneeEmail,
    assigneeName,
    todoId,
    todoTitle,
    todoDescription,
    todoPriority,
    todoDueDate,
    assignerName,
    organizationName,
  } = params;

  const todoUrl = `${APP_URL}/app/todos/${todoId}`;

  const priorityColors = {
    low: "#6b7280",
    medium: "#f59e0b",
    high: "#ef4444",
  };

  const priorityColor = priorityColors[todoPriority];
  const priorityLabel = todoPriority.charAt(0).toUpperCase() + todoPriority.slice(1);

  const dueDateText = todoDueDate
    ? new Date(todoDueDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "No due date";

  await sendEmail({
    to: assigneeEmail,
    subject: `You've been assigned to: ${todoTitle}`,
    text: `Hi ${assigneeName},

${assignerName} has assigned you to a task in ${organizationName}.

Task: ${todoTitle}
${todoDescription ? `\nDescription: ${todoDescription}\n` : ""}
Priority: ${priorityLabel}
Due Date: ${dueDateText}

View and manage this task at:
${todoUrl}

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
  <h1 style="color: #2563eb;">New Task Assignment</h1>
  <p>Hi ${assigneeName},</p>
  <p><strong>${assignerName}</strong> has assigned you to a task in <strong>${organizationName}</strong>.</p>

  <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
    <h2 style="margin-top: 0; color: #1f2937; font-size: 18px;">${todoTitle}</h2>
    ${todoDescription ? `<p style="color: #4b5563; margin: 8px 0;">${todoDescription}</p>` : ""}
    <div style="margin-top: 12px;">
      <span style="display: inline-block; background-color: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-right: 8px;">
        ${priorityLabel} Priority
      </span>
      <span style="color: #6b7280; font-size: 14px;">
        Due: ${dueDateText}
      </span>
    </div>
  </div>

  <p style="text-align: center; margin: 30px 0;">
    <a href="${todoUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Task</a>
  </p>

  <p>Best regards,<br>The Todo App Team</p>
</body>
</html>`,
  });
}
