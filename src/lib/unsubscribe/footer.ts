/**
 * Generate the unsubscribe footer HTML to append to emails
 */
export function generateUnsubscribeFooter(unsubscribeUrl: string): string {
  return `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <p style="margin: 0;">
    If you no longer wish to receive these emails, you can
    <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">unsubscribe here</a>.
  </p>
</div>`;
}

/**
 * Generate the plain text unsubscribe footer
 */
export function generateUnsubscribeFooterText(unsubscribeUrl: string): string {
  return `\n\n---\nIf you no longer wish to receive these emails, unsubscribe here: ${unsubscribeUrl}`;
}

/**
 * Generate List-Unsubscribe headers for RFC 8058 one-click unsubscribe
 * These headers allow email clients to show an unsubscribe button
 */
export function generateListUnsubscribeHeaders(
  unsubscribeUrl: string,
  recipientEmail: string
): Record<string, string> {
  // The List-Unsubscribe-Post header enables one-click unsubscribe
  // Email clients will POST to the URL with "List-Unsubscribe=One-Click"
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/**
 * Build the full unsubscribe URL
 */
export function buildUnsubscribeUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base}/api/unsubscribe/${token}`;
}

/**
 * Inject unsubscribe footer into HTML email body
 */
export function injectUnsubscribeFooter(
  htmlBody: string,
  unsubscribeUrl: string
): string {
  const footer = generateUnsubscribeFooter(unsubscribeUrl);

  // Try to inject before closing body tag if present
  if (htmlBody.toLowerCase().includes("</body>")) {
    return htmlBody.replace(
      /<\/body>/i,
      `${footer}</body>`
    );
  }

  // Otherwise just append
  return htmlBody + footer;
}

/**
 * Inject unsubscribe text into plain text email body
 */
export function injectUnsubscribeText(
  textBody: string,
  unsubscribeUrl: string
): string {
  return textBody + generateUnsubscribeFooterText(unsubscribeUrl);
}
