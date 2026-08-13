export type EmailTemplateKey =
  | "welcome"
  | "staff_invitation"
  | "trial_started"
  | "trial_ending_7"
  | "trial_ending_2"
  | "payment_successful"
  | "payment_failed"
  | "subscription_cancelled"
  | "quote_sent"
  | "invoice_sent"
  | "payment_reminder"
  | "service_reminder"
  | "job_assigned";

export type BuiltInTemplate = {
  key: EmailTemplateKey;
  name: string;
  category: "Account" | "Billing" | "Customer" | "Workshop";
  subject: string;
  body: string;
  description: string;
};

export const BUILT_IN_EMAIL_TEMPLATES: BuiltInTemplate[] = [
  { key: "welcome", name: "Welcome", category: "Account", description: "Sent after a new AgriCore company is created.", subject: "Welcome to AgriCore, {{first_name}}", body: "Your {{company_name}} workspace is ready.\n\nYour 14-day {{plan_name}} trial is now active. Sign in to complete the Setup Assistant and start adding customers, machines and jobs.\n\n{{action_url}}" },
  { key: "staff_invitation", name: "Staff invitation", category: "Account", description: "Sent when a staff member is added to a company.", subject: "You've been added to {{company_name}} on AgriCore", body: "Hi {{first_name}},\n\nYou've been added to {{company_name}} on AgriCore as {{role_name}}.\n\nSign in here:\n{{action_url}}" },
  { key: "trial_started", name: "Trial started", category: "Billing", description: "Confirms the selected AgriCore trial plan.", subject: "Your AgriCore trial has started", body: "Your {{trial_days}}-day AgriCore {{plan_name}} trial for {{company_name}} is active until {{trial_end}}.\n\nYou can manage billing at any time here:\n{{action_url}}" },
  { key: "trial_ending_7", name: "Trial ending — 7 days", category: "Billing", description: "Trial reminder seven days before expiry.", subject: "7 days left in your AgriCore trial", body: "Your AgriCore trial for {{company_name}} ends on {{trial_end}}.\n\nOpen Billing & Subscription to make sure your payment details are ready:\n{{action_url}}" },
  { key: "trial_ending_2", name: "Trial ending — 2 days", category: "Billing", description: "Trial reminder two days before expiry.", subject: "2 days left in your AgriCore trial", body: "Your AgriCore trial for {{company_name}} ends on {{trial_end}}.\n\nManage your subscription here:\n{{action_url}}" },
  { key: "payment_successful", name: "Payment successful", category: "Billing", description: "Sent when Stripe records a successful subscription payment.", subject: "AgriCore payment received", body: "We've received your AgriCore subscription payment for {{company_name}}.\n\nAmount: {{amount}}\nInvoice: {{invoice_number}}\n\nThank you for using AgriCore." },
  { key: "payment_failed", name: "Payment failed", category: "Billing", description: "Sent after a failed subscription payment.", subject: "Action needed: AgriCore payment failed", body: "We couldn't collect the AgriCore subscription payment for {{company_name}}.\n\nPlease update your payment method to avoid an interruption in service:\n{{action_url}}" },
  { key: "subscription_cancelled", name: "Subscription cancelled", category: "Billing", description: "Sent when a subscription is scheduled to end or cancelled.", subject: "AgriCore subscription update", body: "Your AgriCore subscription for {{company_name}} has been cancelled{{period_end_text}}.\n\nYou can reactivate it from Billing & Subscription while access is still active:\n{{action_url}}" },
  { key: "quote_sent", name: "Quote sent", category: "Customer", description: "Customer-facing quotation email.", subject: "Quotation {{quote_number}} from {{company_name}}", body: "Hello {{customer_name}},\n\nPlease find the details of quotation {{quote_number}} from {{company_name}}.\n\nTotal: {{total}}\n\n{{message}}" },
  { key: "invoice_sent", name: "Invoice sent", category: "Customer", description: "Customer-facing invoice email.", subject: "Invoice {{invoice_number}} from {{company_name}}", body: "Hello {{customer_name}},\n\nPlease find invoice {{invoice_number}} from {{company_name}} attached.\n\nTotal: {{total}}\nDue: {{due_date}}\n\n{{message}}\n\n{{payment_text}}" },
  { key: "payment_reminder", name: "Payment reminder", category: "Customer", description: "Manual or future scheduled payment reminder.", subject: "Payment reminder — invoice {{invoice_number}}", body: "Hello {{customer_name}},\n\nThis is a reminder that invoice {{invoice_number}} for {{total}} is due {{due_date}}.\n\n{{payment_text}}" },
  { key: "service_reminder", name: "Service reminder", category: "Workshop", description: "Future service reminder email.", subject: "Service reminder for {{machine_name}}", body: "Hello {{customer_name}},\n\n{{machine_name}} is due for service {{service_due}}.\n\nPlease contact {{company_name}} to arrange a suitable time." },
  { key: "job_assigned", name: "Job assigned", category: "Workshop", description: "Internal technician job assignment message.", subject: "New AgriCore job: {{job_number}}", body: "Hi {{first_name}},\n\nYou've been assigned job {{job_number}} for {{customer_name}}.\n\n{{job_summary}}\n\nOpen job:\n{{action_url}}" },
];

export function builtInTemplate(key: string) {
  return BUILT_IN_EMAIL_TEMPLATES.find((template) => template.key === key) ?? null;
}

export function mergeVariables(template: string, values: Record<string, unknown>) {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
    const value = values[key];
    return value === null || value === undefined ? "" : String(value);
  });
}
