import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/payments/supabase-admin";
import { loadCompanySettings } from "@/app/api/_company/load-company-settings";
import { builtInTemplate, mergeVariables, type EmailTemplateKey } from "./templates";

type Attachment = { filename: string; content: string; content_type?: string };

type SendCompanyEmailInput = {
  companyId: string;
  to: string | string[];
  recipientName?: string | null;
  templateKey: EmailTemplateKey;
  variables?: Record<string, unknown>;
  subjectOverride?: string | null;
  bodyOverride?: string | null;
  replyTo?: string | null;
  attachments?: Attachment[];
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  createdBy?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
};

function apiKey() {
  const value = process.env.RESEND_API_KEY?.trim();
  if (!value) throw new Error("RESEND_API_KEY is not configured.");
  return value;
}

function defaultFrom() {
  return process.env.AGRICORE_EMAIL_FROM?.trim() || "AgriCore <notifications@getagricore.com>";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function paragraphs(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((paragraph) => `<p style="margin:0 0 16px;line-height:1.65;color:#334155">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function brandedHtml(input: { companyName: string; primary: string; body: string; footer?: string | null }) {
  const primary = /^#[0-9a-f]{6}$/i.test(input.primary) ? input.primary : "#103D2E";
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0"><tr><td style="padding:24px 30px;background:${primary};color:#fff"><div style="font-size:22px;font-weight:800">${escapeHtml(input.companyName)}</div><div style="margin-top:4px;font-size:12px;opacity:.82">Powered by AgriCore</div></td></tr><tr><td style="padding:30px">${paragraphs(input.body)}</td></tr><tr><td style="padding:20px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5">${escapeHtml(input.footer || "This message was sent through AgriCore.")}</td></tr></table></td></tr></table></body></html>`;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function sendCompanyEmail(input: SendCompanyEmailInput) {
  const admin = createSupabaseAdmin();
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map(normalizeEmail).filter((email) => email.includes("@"));
  if (!recipients.length) throw new Error("A valid recipient email address is required.");

  const [settingsResult, templateResult, companySettings] = await Promise.all([
    admin.from("company_email_settings").select("*").eq("company_id", input.companyId).maybeSingle(),
    admin.from("company_email_templates").select("subject_template,body_template,enabled").eq("company_id", input.companyId).eq("template_key", input.templateKey).maybeSingle(),
    loadCompanySettings(admin as unknown as SupabaseClient, input.companyId),
  ]);
  if (settingsResult.error) throw new Error(settingsResult.error.message);
  if (templateResult.error) throw new Error(templateResult.error.message);
  if (settingsResult.data?.enabled === false || templateResult.data?.enabled === false) return { skipped: true, reason: "Email template is disabled." };

  const suppressed = await admin.from("email_suppressions").select("email").eq("company_id", input.companyId).in("email", recipients);
  if (suppressed.error) throw new Error(suppressed.error.message);
  const blocked = new Set((suppressed.data ?? []).map((row) => normalizeEmail(row.email)));
  const deliverable = recipients.filter((email) => !blocked.has(email));
  if (!deliverable.length) return { skipped: true, reason: "Recipient is suppressed after a previous delivery failure." };

  const builtIn = builtInTemplate(input.templateKey);
  if (!builtIn) throw new Error(`Unknown email template: ${input.templateKey}`);
  const variables = { company_name: companySettings.company_name, ...input.variables };
  const subject = mergeVariables(input.subjectOverride || templateResult.data?.subject_template || builtIn.subject, variables).trim();
  const body = mergeVariables(input.bodyOverride || templateResult.data?.body_template || builtIn.body, variables).trim();

  const senderSettings = settingsResult.data;
  const useCustomSender =
    senderSettings?.email_mode === "custom_domain" &&
    senderSettings?.custom_sender_verified === true &&
    senderSettings?.domain_status === "verified" &&
    Boolean(senderSettings?.from_email);

  const from = useCustomSender
    ? `${senderSettings.sender_name || companySettings.company_name} <${senderSettings.from_email}>`
    : defaultFrom();
  const replyTo = input.replyTo || senderSettings?.reply_to_email || companySettings.email || undefined;
  const idempotencyKey = (input.idempotencyKey || `${input.templateKey}:${input.companyId}:${input.relatedEntityId || crypto.randomUUID()}`).slice(0, 250);

  const { data: existing } = await admin.from("email_messages").select("id,provider_message_id,status").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing) return { id: existing.provider_message_id, logId: existing.id, duplicate: true, status: existing.status };

  const logId = crypto.randomUUID();
  const { error: logError } = await admin.from("email_messages").insert({
    id: logId,
    company_id: input.companyId,
    template_key: input.templateKey,
    recipient_email: deliverable.join(", "),
    recipient_name: input.recipientName || null,
    subject,
    status: "queued",
    related_entity_type: input.relatedEntityType || null,
    related_entity_id: input.relatedEntityId || null,
    idempotency_key: idempotencyKey,
    metadata: input.metadata || {},
    created_by: input.createdBy || null,
  });
  if (logError) throw new Error(logError.message);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: deliverable,
        subject,
        html: brandedHtml({ companyName: companySettings.company_name, primary: companySettings.primary_colour, body, footer: companySettings.invoice_footer }),
        text: body,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(input.attachments?.length ? { attachments: input.attachments } : {}),
        tags: [
          { name: "company", value: input.companyId.replace(/[^a-zA-Z0-9_-]/g, "_") },
          { name: "template", value: input.templateKey },
        ],
      }),
      cache: "no-store",
    });
    const result = (await response.json()) as { id?: string; message?: string; error?: { message?: string } };
    if (!response.ok || !result.id) throw new Error(result.error?.message || result.message || "Resend rejected the email.");
    await admin.from("email_messages").update({ provider_message_id: result.id, status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", logId);
    return { id: result.id, logId, duplicate: false, status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send email.";
    await admin.from("email_messages").update({ status: "failed", error_message: message, failed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", logId);
    throw error;
  }
}

export function verifyResendWebhook(payload: string, headers: Headers) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!id || !timestamp || !signatures || !secret) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const secretValue = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try { key = Buffer.from(secretValue, "base64"); } catch { return false; }
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`, "utf8").digest("base64");
  return signatures.split(" ").some((entry) => {
    const value = entry.startsWith("v1,") ? entry.slice(3) : "";
    try {
      const expectedBuffer = Buffer.from(expected);
      const actualBuffer = Buffer.from(value);
      return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
    } catch { return false; }
  });
}
