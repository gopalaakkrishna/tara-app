# v14.7.10 — honest sync health and critical-evidence publication

Personal Cloudflare taracalls only. No schema, database security/timeout, forecast,
420-second cutoff, threshold, AutoTrade setting, budget, order or exit changes.

Record-write failures stay visible until that exact writer acknowledges recovery;
an unrelated successful cloud operation cannot hide a Call/hourly write timeout.
New original captures and same-ID results/blockers/corrections queue publication
after 1.5s instead of the ordinary 60s telemetry batch. Per-document ownership,
fresh read/merge/CAS, 15s request cancellation, no-op suppression and bounded retry
remain unchanged. These changes do not claim to eliminate an external database
statement timeout or prove its underlying server cause.

Verification: 348 production tests; isolated eight-page desktop/mobile smoke;
protected AST/file comparison against e6ccc1d. Live entry remains unconditionally
paused. A release is not a fresh account-risk or profitability pass.

Independent local monitoring repair (not shipped in the application): fsynced
append-only events, retry the full body until durably acknowledged, endpoint
failure isolation, single-instance lease, fixed absolute end and saved report.
Previous incomplete cohort is preserved, never extended/backfilled for fills.

Rollback trigger: new local persistence/merge regression, settings/policy drift,
or critical app render failure. Restore the prior verified e6ccc1d personal Pages
deployment only if required; preserve records and keep live entries paused. No
automated rollback, database mutation, order or budget reset is authorized.
