# One T Media Group Domain Setup

Custom domain prepared for GitHub Pages:

```
onetmediagroup.ca
```

Files added/updated:

- `CNAME` tells GitHub Pages to use `onetmediagroup.ca`.
- `sitemap.xml` now uses `https://onetmediagroup.ca/`.
- `robots.txt` points search engines to the new sitemap.
- SEO/social URLs were updated from the GitHub Pages URL to the new domain.

Cloudflare/GitHub setup still needs to be completed outside the code:

1. Add `onetmediagroup.ca` as the custom domain in GitHub Pages settings.
2. Add the required DNS records in Cloudflare.
3. Wait for DNS to verify.
4. Enable HTTPS in GitHub Pages once available.

Floor Flow demo links were intentionally left pointing to the current working GitHub Pages FloorFlow-Demo URL until that app is moved or given its own domain/subdomain.
