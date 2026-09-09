const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: { filename: string; content: string }[];
}

export interface SendEmailResult {
  id?: string;
  error?: string;
}

export async function sendEmailViaResend(opts: SendEmailOptions): Promise<SendEmailResult> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableApiKey || !resendApiKey) {
    return { error: "Resend connector is not linked to this project" };
  }

  const response = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": resendApiKey,
    },
    body: JSON.stringify(opts),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Resend gateway request failed [${response.status}]: ${body}`);
    return { error: `Provider request failed: ${response.status} ${body}` };
  }

  const data = await response.json().catch(() => ({}));
  if (data.error) {
    return { error: typeof data.error === "string" ? data.error : JSON.stringify(data.error) };
  }
  return { id: data.id };
}

export function getResendFromEmail(): string {
  return Deno.env.get("RESEND_FROM_EMAIL") || "intern@kernelgreens.com";
}
