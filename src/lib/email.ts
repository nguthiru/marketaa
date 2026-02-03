import { Resend } from "resend";

// Lazy initialization to avoid build-time errors when API key is not set
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const fromEmail = params.from || process.env.RESEND_FROM_EMAIL || "noreply@example.com";

  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      text: params.body || "",
      html: params.html,
      replyTo: params.replyTo,
      headers: params.headers,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, resendId: data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Convert plain text to simple HTML with paragraphs
 */
export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const paragraphs = escaped.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
  ${paragraphs.join("\n  ")}
</body>
</html>`;
}

export function validateEmailRecipient(email: string | null | undefined): string | null {
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email : null;
}
