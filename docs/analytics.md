# Optional usage analytics

DetectionForge uses optional Google Analytics 4 to understand adoption, identify useful features,
guide improvements, and justify continued maintenance. It is not used for advertising. Counts
represent consenting, unblocked browsers; low counts do not prove that nobody uses the app.

The measurement ID is `G-P0C3RG2X1T`. This is a public identifier, not a secret.

## Consent and security boundary

- Analytics is off until the user chooses **Allow analytics**. Both choices have equal visual weight.
  The notice is nonblocking and **Privacy & analytics** is available on every page.
- Before consent or after declining, the app does not load the Google tag, create analytics cookies,
  send analytics requests (including consent pings), or queue historical activity.
- Consent can be saved while the initial route is loading. Tag startup waits until that route is
  ready, so the first page view uses the resolved section and initialization cannot disable an early grant.
- The versioned local preference is `df_analytics_consent_v1`. It is separate from workbench settings
  and configuration exports; importing a configuration must never grant analytics consent.
- Withdrawal disables collection immediately, deletes only `df_usage_` cookies, and reloads to unload
  Google's code. The UI warns that this clears memory-only credentials and can affect unsaved work.
  Other tabs follow changes through the browser storage event, including consent removal.
- Storage failures fail closed for new grants. If withdrawal cannot be saved, removal of the saved
  grant is attempted. If both operations fail, collection stops in that tab without reloading into
  stale consent; the UI explains how to clear site storage. Requests already in flight cannot be recalled.
- A failed or blocked tag does not prevent the app from working. No proxy or blocker bypass is used.
- Credentials/JWTs remain in memory and are sent to LimaCharlie for normal authentication/API use.
  They are not read or included in analytics by our integration.

Google's script runs in the same page environment as the credential-bearing app after opt-in.
Memory-only storage does **not** isolate secrets from third-party JavaScript. This implementation
minimizes deliberate collection; it does not sandbox Google's script or claim anonymous tracking.
Google receives network information when contacted. A requirement for technical isolation would
need a different architecture, not different consent copy.

## Event contract

| Event           | Trigger                                                                    | App-specific parameters                                    |
| --------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `page_view`     | Initial route after consent; subsequent successful route navigation        | Fixed `page_location`, `page_title`, empty `page_referrer` |
| `unit_test_run` | Each individual unit test submitted to the API, including tests in a batch | Same fixed page metadata only                              |
| `backtest_run`  | Backtest starts after checks and billing confirmation                      | Same fixed page metadata only                              |
| `rule_export`   | An IaC export attempt after required content checks                        | Same fixed page metadata only                              |

Approved routes: `/`, `/workbench`, `/config`, `/changelog`, `/privacy`. Unknown routes map to
`/other`. All locations use the fixed `https://detectionforge.ddi.sh` origin. No query strings,
fragments, document referrers, dynamic titles, or user-supplied paths are forwarded.

GA also generates standard first-visit, session, and engagement measurements and includes standard
browser/device fields and cookie identifiers. The table describes our application events, not an
assertion that Google's payload contains only those three parameters.

Never attach credentials, JWTs, user/organization IDs or names, rules or rule names, samples,
results, filenames, API URLs, exception messages, arbitrary objects, or user properties. The
analytics module must not import authentication, API, storage, or workbench state. The action API
accepts only a runtime-checked allowlist and has no parameter bag. Adding an event requires updating
this contract, the privacy page, and boundary tests.

## Required GA property configuration before activation

The tag snippet alone cannot enforce the following dashboard settings. Keep the deployment switch
off until a maintainer checks the property/stream matching `G-P0C3RG2X1T` and records the verification
in the PR or deployment record:

- [ ] Disable **Enhanced measurement**, including history-based page views, scrolls, outbound clicks,
      search, video, downloads, and form interactions. Initial page views are disabled in code and
      sent manually with fixed metadata.
- [ ] Disable Google Signals, advertising personalization, and user-provided data collection. Do not
      link Ads products, enable cross-domain measurement, add connected tag destinations, configure
      event creation/modification rules, or install additional tracking through Tag Manager.
- [ ] Set event/user retention to **2 months**, with **Reset user data on new activity** off. Standard
      aggregated reports are outside this retention setting; do not promise deletion of all data at
      two months.
- [ ] Disable optional account data sharing that is unnecessary for usage reporting. Limit property
      access to maintainers who need it.
- [ ] Verify request payloads in a controlled browser with fake credentials and data, then verify
      approved events in GA using a consenting test browser. Do not use real secrets for validation.
- [ ] Check that the notice, privacy page, and this document accurately describe the live settings.

Code also disables Signals and advertising personalization, denies all advertising consent types,
and sets host-only `df_usage_` cookies with a 30-day lifetime, no rolling expiry, and Secure/SameSite=Lax.
Do not change GA dashboard collection settings independently of this public contract.

## Deployment and rollback

The deployment workflow reads the GitHub Actions repository variable `ANALYTICS_ENABLED`. Only the
exact string `true` produces a production build that can load analytics. An unset variable leaves
analytics unavailable, hides the consent notice, and explains this on the privacy page. Development
builds are always off. Self-hosted builds default to off; do not enable the DDI property for a fork.

After completing the checklist, set the variable to `true` and run the normal approved deployment.
Changing the variable alone does not change already-built JavaScript. To stop collection, unset it
or set it to `false` and rebuild/redeploy. Open tabs and installed PWAs need to receive/reload the new
build; the switch cannot revoke code already loaded in an existing tab.

For a local production preview with the consent UI enabled:

```sh
VITE_ANALYTICS_ENABLED=true npm run build-only
npm run preview -- --host 127.0.0.1
```

Only allow analytics in such a preview when deliberately validating the tag. Use network interception
to inspect and discard collection requests if the test should not write events to the property.

## Verification

Run `npm test`, `npm run type-check`, `npx eslint . --max-warnings 0`, and `npm run build`.
The consent tests cover default/declined/invalid consent, disabled deployments, storage failures,
loading races, withdrawal, other tabs, cookie cleanup, blocked tags, and synthetic secret exclusion.
Browser verification must additionally cover the actual Google tag's payloads, routing, both choices
across reloads, withdrawal after load, blocked Google requests, and mobile/keyboard readability.

Sources: [Google tag configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config),
[basic vs advanced consent](https://developers.google.com/tag-platform/security/concepts/consent-mode),
[enhanced measurement](https://support.google.com/analytics/answer/9216061),
[data retention](https://support.google.com/analytics/answer/7667196),
[disable analytics](https://developers.google.com/tag-platform/security/guides/privacy).
