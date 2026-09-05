# Bike Pressure Lab — Security Notes (Beta 4.1.3)

This is a static GitHub Pages PWA. Beta 4.1.3 adds lightweight client-side hardening:

- self-only Content Security Policy (CSP) via HTML meta tag
- no-referrer policy
- strict numeric / enum input validation in the engine
- 300 ms manual calculation click throttle
- same-origin-only Service Worker caching
- no `eval`, `innerHTML`, `document.write`, or external JS dependencies

## Important limitation
Client-side code cannot provide real DDoS mitigation, server-side rate limiting, private authentication, or protection from a compromised GitHub account. Those require the hosting/CDN/account layer (for example GitHub account 2FA and, if needed later, Cloudflare Access/WAF/Rate Limiting).
