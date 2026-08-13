# AgriCore paid acquisition — launch today checklist

Use this in order. Do not increase spend until conversion tracking is confirmed in production.

## 1. Production checks

- Confirm `/`, `/pricing`, `/demo`, `/contact` and `/roi-calculator` load on the production domain.
- Complete one test demo request and confirm it appears in Platform → Launch leads.
- Complete one test trial signup far enough to confirm the trial-start conversion event fires.
- Confirm cookie consent blocks marketing/analytics tags until accepted.

## 2. Tracking IDs in Vercel

Add only the providers you are ready to use. Redeploy after changing environment variables.

- Google Analytics measurement ID
- Meta Pixel ID
- LinkedIn Partner / Insight ID
- Microsoft Clarity project ID

Keep secret API keys server-side. Only public measurement identifiers belong in `NEXT_PUBLIC_*` variables.

## 3. Google Search first

Start with high-intent search before broad awareness.

Campaign groups:

1. Agricultural engineering software → `/agricultural-engineering-software`
2. Farm machinery workshop software → `/farm-machinery-workshop-software`
3. Mobile job sheets → `/mobile-job-sheets-agricultural-engineers`
4. Machinery service management → `/machinery-service-management-software`

Use the existing build sheet and CSV files in this folder. Add UTM parameters to every final URL.

Initial optimisation events:

- `trial_start`
- `demo_request`
- `pricing_view`
- `demo_view`

Treat `trial_start` and `demo_request` as primary conversions. The other events are diagnostic signals.

## 4. First markets

Launch English-speaking markets in controlled groups rather than one worldwide campaign so performance can be compared:

- United Kingdom
- Ireland
- Australia
- New Zealand
- Canada
- United States

Keep separate campaigns or location groups where practical so spend and conversion rate are visible by market.

## 5. Meta

Start with remarketing and a small prospecting test after enough website traffic exists.

Creative themes:

- From callout to invoice in one system
- Machine history that follows the machine
- Mobile job cards for agricultural engineers
- AI Workshop Assistant with machine history in context

Send high-intent visitors to the most relevant landing page rather than always to the homepage.

## 6. LinkedIn

Use narrowly targeted tests for dealership and larger-service-company roles. Send dealer audiences to the machinery-dealer industry page or demo request page.

Do not judge LinkedIn on click cost alone. Measure qualified demo requests and trial quality.

## 7. Daily review

For the first 7 days record:

- Spend
- Clicks
- Landing-page visits
- Demo requests
- Trial starts
- Cost per demo request
- Cost per trial
- Country
- Search term / audience

Pause irrelevant search terms quickly. Do not optimise toward raw traffic if it does not create qualified demo requests or trials.

## 8. ROI calculator

Use `/roi-calculator` in sales follow-up, remarketing and dealer outreach. It is intentionally an illustrative planning tool, not a guaranteed savings claim.
