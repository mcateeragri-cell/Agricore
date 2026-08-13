# AgriCore Google Search launch build

Use separate campaigns by country. Do not combine countries until enough conversion data exists to justify doing so.

## Campaign A — Agricultural engineering software
Landing page: `/agricultural-engineering-software`

Ad groups and keyword themes:
- agricultural engineering software
- agricultural engineer software
- agricultural service management software
- agricultural engineering CRM
- software for agricultural engineers

Recommended UTM base:
`?utm_source=google&utm_medium=cpc&utm_campaign={country}_ag_engineering&utm_content={ad_group}`

## Campaign B — Farm machinery workshop software
Landing page: `/farm-machinery-workshop-software`

Ad groups and keyword themes:
- farm machinery workshop software
- agricultural workshop software
- machinery workshop management software
- farm equipment workshop software
- workshop software agricultural machinery

Recommended UTM base:
`?utm_source=google&utm_medium=cpc&utm_campaign={country}_workshop&utm_content={ad_group}`

## Campaign C — Mobile job sheets
Landing page: `/mobile-job-sheets-agricultural-engineers`

Ad groups and keyword themes:
- mobile job sheets agricultural engineers
- digital job cards agricultural engineers
- field engineer job sheet app
- mobile mechanic job sheet software
- agricultural field service software

Recommended UTM base:
`?utm_source=google&utm_medium=cpc&utm_campaign={country}_mobile_jobs&utm_content={ad_group}`

## Campaign D — Machinery service management
Landing page: `/machinery-service-management-software`

Ad groups and keyword themes:
- machinery service management software
- machinery service software
- equipment service management software
- machinery maintenance management software
- machinery service CRM

Recommended UTM base:
`?utm_source=google&utm_medium=cpc&utm_campaign={country}_service_management&utm_content={ad_group}`

## Launch countries
Create one campaign set for each:
- GB — United Kingdom
- IE — Ireland
- AU — Australia
- NZ — New Zealand
- CA — Canada
- US — United States

## Initial conversion priority
Primary conversions:
1. `trial_signup_created`
2. `demo_request_submitted`

Secondary observation events:
- `trial_cta_clicked`
- `demo_cta_clicked`
- `product_demo_clicked`
- `pricing_clicked`

## Negative keyword themes
Review actual search terms frequently. Start with exclusions around:
- jobs
- careers
- salary
- university
- degree
- course
- free download
- cracked
- game
- simulator
- machinery for sale
- tractors for sale

Do not add broad negative keywords that could block genuine service-management intent without checking the search term first.
