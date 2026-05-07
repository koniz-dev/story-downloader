# Known limitations

## Stories almost never work

Both Instagram and Facebook Stories are gated behind an authenticated session.
Anonymous datacenter-IP requests from a Cloudflare Worker get redirected to
login or hit rate limits. Stories are kept as a best-effort attempt but most
will fail with `INSTAGRAM_STORY_BLOCKED` / `FACEBOOK_STORY_BLOCKED`.

## Private and friends-only content cannot be downloaded

This tool only sees what an anonymous browser sees — i.e. Open Graph meta tags
on public posts. Private accounts, friends-only Facebook posts, and private
groups are invisible to it.

## Cloudflare IPs are heavily rate-limited

Meta flags Cloudflare Worker IP ranges aggressively. Even legitimate public
content can return rate-limit errors during peak hours. If you see
`*_RATE_LIMITED`, wait 1–2 minutes and retry.

## Expired content returns 404

Stories expire after 24 hours; deleted posts return 404. The Worker surfaces
these as `*_NOT_FOUND` / `*_STORY_EXPIRED`.

## The parser breaks when Meta ships HTML changes

Instagram and Facebook change their HTML structure and endpoints frequently.
When the parser starts failing across the board, the fix lives in
[`worker/src/platforms/`](../worker/src/platforms). Open an issue with the URL
that broke and the error code so it can be reproduced.

## What the proxy will *not* do

`/api/proxy` is restricted to `*.cdninstagram.com`, `*.fbcdn.net`,
`*.facebook.com`, `*.instagram.com`. It is not an open proxy and will not fetch
arbitrary URLs.

## Quality

Media is served back at whatever quality the public Open Graph meta tag points
to — typically the same resolution Instagram/Facebook serves to logged-out
viewers. Higher-bitrate variants that require auth are not accessible.
