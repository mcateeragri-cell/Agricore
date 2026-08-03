AgriCore Invoice WhatsApp and PDF Share Patch

Replace into C:\projects\Agricore\frontend:
- app\invoices\[id]\page.tsx
- app\api\invoices\[id]\route.ts

Adds:
- Choose contact name or business name before sending.
- Choose invoice only or service report + invoice.
- Native PDF sharing on iPhone/iPad/Android, where WhatsApp can be selected.
- Direct WhatsApp message button using the saved customer phone number.
- Email sending remains available.
- Payment link can still be included.

Important browser limitation:
A normal WhatsApp web link cannot automatically attach a PDF. The Share PDF / WhatsApp button uses the device share sheet so the selected PDF can be shared as an attachment. On unsupported desktop browsers, the PDF downloads and WhatsApp opens so it can be attached manually.

After extracting:
Remove-Item ".\.next" -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
