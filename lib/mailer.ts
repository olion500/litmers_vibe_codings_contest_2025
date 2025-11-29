import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "127.0.0.1";
const smtpPort = Number(process.env.SMTP_PORT || 1025);
const mailFrom = process.env.MAIL_FROM || "no-reply@jira-lite.local";
const appUrl = process.env.APP_URL || "http://localhost:3000";

// Mailpit SMTP transport (localhost:1025 for local development)
export const mailer = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: false,
});

/**
 * Send password reset email with 1-hour expiration token
 * Fire-and-forget: logs errors but doesn't block caller
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your password. Click the link below to proceed:</p>
        <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
        <p>Or copy this link: <a href="${resetLink}">${resetLink}</a></p>
        <p style="color: #999; font-size: 12px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </body>
    </html>
  `;

  const textContent = `
Reset Your Password

We received a request to reset your password. Click the link below to proceed:

${resetLink}

This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
  `;

  try {
    const result = await mailer.sendMail({
      from: mailFrom,
      to: email,
      subject: "Reset Your Password - Jira Lite",
      html: htmlContent,
      text: textContent,
    });
    console.log(`[Email] Password reset sent to ${email}`, { messageId: result.messageId });
  } catch (error) {
    console.error(`[Email] Failed to send password reset to ${email}:`, error);
    // Fire-and-forget: don't throw, let caller continue
  }
}

/**
 * Send team invitation email with 7-day expiration token
 * Fire-and-forget: logs errors but doesn't block caller
 */
export async function sendTeamInviteEmail(
  email: string,
  teamName: string,
  token: string,
  inviterName?: string
) {
  const inviteLink = `${appUrl}/invite?token=${encodeURIComponent(token)}`;
  const inviterInfo = inviterName ? `${inviterName} has invited you` : "You have been invited";

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>Team Invitation</h2>
        <p>${inviterInfo} to join <strong>${teamName}</strong> on Jira Lite.</p>
        <p><a href="${inviteLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a></p>
        <p>Or copy this link: <a href="${inviteLink}">${inviteLink}</a></p>
        <p style="color: #999; font-size: 12px;">This invitation expires in 7 days. If you don't have an account, you'll be able to create one when you click the link.</p>
      </body>
    </html>
  `;

  const textContent = `
Team Invitation

${inviterInfo} to join ${teamName} on Jira Lite.

Accept invitation: ${inviteLink}

This invitation expires in 7 days. If you don't have an account, you'll be able to create one when you click the link.
  `;

  try {
    const result = await mailer.sendMail({
      from: mailFrom,
      to: email,
      subject: `You're invited to ${teamName} - Jira Lite`,
      html: htmlContent,
      text: textContent,
    });
    console.log(`[Email] Team invite sent to ${email} for team ${teamName}`, { messageId: result.messageId });
  } catch (error) {
    console.error(`[Email] Failed to send team invite to ${email}:`, error);
    // Fire-and-forget: don't throw, let caller continue
  }
}
