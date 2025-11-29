import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "127.0.0.1";
const smtpPort = Number(process.env.SMTP_PORT || 1025);

export const mailer = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: false,
});

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  await mailer.sendMail({
    from: process.env.MAIL_FROM || "no-reply@jira-lite.local",
    to: email,
    subject: "Reset your password",
    html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${link}">${link}</a></p>`,
  });
}
