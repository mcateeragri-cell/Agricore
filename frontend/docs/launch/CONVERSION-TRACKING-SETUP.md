# AgriCore paid-marketing measurement setup

AgriCore now supports consent-aware public marketing measurement. None of the optional providers load unless both conditions are true:

1. The relevant public environment variable is configured.
2. The visitor chooses **Accept analytics** on the public marketing site.

## Supported providers

Add only the providers you intend to use in Vercel:

```env
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
NEXT_PUBLIC_LINKEDIN_PARTNER_ID=1234567
NEXT_PUBLIC_LINKEDIN_CONVERSION_ID=12345678
NEXT_PUBLIC_CLARITY_PROJECT_ID=xxxxxxxxxx
```

All are optional. Leaving an ID absent leaves that provider disabled.

## Events emitted by AgriCore

The public marketing layer emits:

- `page_view`
- `trial_cta_clicked`
- `demo_cta_clicked`
- `product_demo_clicked`
- `pricing_clicked`
- `demo_request_submitted`
- `trial_signup_created`

The demo-request database already stores UTM source, medium and campaign information independently of optional analytics cookies.

## Recommended paid-campaign conversions

### Primary
- `trial_signup_created`
- `demo_request_submitted`

### Secondary / optimisation
- `trial_cta_clicked`
- `demo_cta_clicked`
- `product_demo_clicked`

Do not optimise paid campaigns for raw page views once enough trial/demo conversion data exists.

## UTM format

Use the campaign convention already documented in `AD-LAUNCH-PLAYBOOK.md`:

```text
?utm_source=google&utm_medium=cpc&utm_campaign=uk_agricultural_engineers&utm_content=machine_history
```

Keep each country in its own campaign so cost per qualified trial/demo can be compared properly.

## Privacy / consent

The cookie banner is deliberately opt-in for optional analytics. Essential session/storage functionality is separate. Before large international spend, review the final provider configuration, retention settings and legal wording for the territories being targeted.
