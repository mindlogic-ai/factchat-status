# FactChat Status

Public status page for FactChat — https://status.factchat.bot

Built on [Upptime](https://upptime.js.org): GitHub Actions probes every 5 minutes, history
committed to this repo, static site published to GitHub Pages. It runs outside our own
infrastructure on purpose, so it stays up when FactChat doesn't.

## Adding or changing a monitor

Edit `sites:` in `.upptimerc.yml`. Commented-out entries are waiting on health endpoints
(FTC-1957 BE, FTC-1958 SSO) — uncomment once those deploy.

## Declaring an incident by hand

Automated probes catch reachability, not correctness. Billing errors, a single broken tenant,
degraded model quality — none of those turn a monitor red. Open an issue in this repo with the
`incident` label and the affected site's label; it appears on the status page immediately.

Severity, who may declare, and posting SLA are defined in FTC-1960.

## Notes

- Probes run from GitHub-hosted runners in the US. Response-time graphs are useful as a trend,
  not as a measure of what Korean users experience.
- Anything IP-allowlisted is unreachable from those runners. SGI (`sgi-factchat`) is excluded
  for this reason.
- The app lives on tenant subdomains; `factchat.bot` apex is the landing page and is monitored
  separately.
