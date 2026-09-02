# DNS and hosting for hotdogbenchmark.lol

What to do at the registrar, what to do in the repository settings, how to check it worked, and
what the site costs to serve. The site is static files on GitHub Pages. There is no server to run.

The repository already carries `public/CNAME` containing `hotdogbenchmark.lol`. The build reads
it (see [`astro.config.mjs`](../astro.config.mjs)) and sets the canonical origin to
`https://hotdogbenchmark.lol` with a base path of `/`, so no `SITE_URL` variable is needed for
this domain. The steps below are the parts that live outside the repository.

## 1. Records at the registrar

Open the DNS settings for `hotdogbenchmark.lol` at the registrar and add these records. Remove
any parking records (an `A` or `CNAME` on the apex or `www` that the registrar added) first,
because a leftover parking record will win the lookup at random.

### Apex (`hotdogbenchmark.lol`, often shown as `@`)

Four `A` records, one per GitHub Pages IPv4 address:

| Type | Name | Value           |
| ---- | ---- | --------------- |
| A    | @    | 185.199.108.153 |
| A    | @    | 185.199.109.153 |
| A    | @    | 185.199.110.153 |
| A    | @    | 185.199.111.153 |

Four `AAAA` records, one per IPv6 address:

| Type | Name | Value               |
| ---- | ---- | ------------------- |
| AAAA | @    | 2606:50c0:8000::153 |
| AAAA | @    | 2606:50c0:8001::153 |
| AAAA | @    | 2606:50c0:8002::153 |
| AAAA | @    | 2606:50c0:8003::153 |

### `www`

One `CNAME` record pointing at the organization's Pages host:

| Type  | Name | Value                        |
| ----- | ---- | ---------------------------- |
| CNAME | www  | en-dash-consulting.github.io |

GitHub redirects `www.hotdogbenchmark.lol` to the apex once the custom domain is set, so the
`www` record only needs to reach GitHub.

### TTL

Set every record to **300 seconds (5 minutes)** while setting up, so a mistake can be corrected
quickly. Once the site has been up for a day, raise them to **3600 seconds (1 hour)**. Longer is
fine but buys nothing here.

Do not add an `ALIAS` or `ANAME` record alongside the `A` records. Do not put a `CNAME` on the
apex; most registrars refuse it, and the ones that allow it break the domain's mail and `TXT`
records.

## 2. The repository settings

In `en-dash-consulting/hotdogbenchmark`, open **Settings > Pages**.

1. **Build and deployment > Source** must be **GitHub Actions**. The deploy workflow
   (`.github/workflows/deploy.yml`) publishes the built `dist/`; there is no branch to serve.
2. Under **Custom domain**, enter `hotdogbenchmark.lol` and press **Save**. GitHub commits
   nothing for this because `public/CNAME` already exists in the repository.
3. Wait for the **DNS check**. It reads the records above; with a 300 second TTL it usually
   passes within a few minutes, and can take up to an hour if the registrar is slow to publish.
   Press **Check again** rather than re-entering the domain.
4. When the check passes, tick **Enforce HTTPS**. The box is disabled until GitHub has issued a
   certificate for the domain, which starts after the DNS check and normally finishes within
   fifteen minutes. If it stays disabled for more than an hour, remove and re-add the custom
   domain once.
5. Trigger a deploy (push to `main`, or run `deploy.yml` from the Actions tab) so the live site is
   the one built with the custom origin.

## 3. Verify

From any machine with `dig` and `curl`.

The apex resolves to the four addresses:

```sh
dig +short hotdogbenchmark.lol A
dig +short hotdogbenchmark.lol AAAA
dig +short www.hotdogbenchmark.lol CNAME
```

Expect the four `185.199.*.153` addresses, the four `2606:50c0:*::153` addresses, and
`en-dash-consulting.github.io.` for `www`.

The apex serves the site over HTTPS:

```sh
curl -I https://hotdogbenchmark.lol/
```

Expect `HTTP/2 200`, a `content-type: text/html`, and a `server: GitHub.com` header.

`www` and plain HTTP both redirect to the apex:

```sh
curl -I http://hotdogbenchmark.lol/
curl -I https://www.hotdogbenchmark.lol/
```

Expect `301` with `location: https://hotdogbenchmark.lol/` on each. A `www` response of `404`
means the `CNAME` record has not propagated or the custom domain is not yet saved.

A missing page returns the site's own 404, not GitHub's:

```sh
curl -I https://hotdogbenchmark.lol/nope
```

Expect `HTTP/2 404`. The body is `404.html` from the build, with the site header and footer.

The four crawl files are served at the root:

```sh
curl -sI https://hotdogbenchmark.lol/robots.txt | head -1
curl -sI https://hotdogbenchmark.lol/sitemap-index.xml | head -1
curl -sI https://hotdogbenchmark.lol/llms.txt | head -1
curl -sI https://hotdogbenchmark.lol/feed.xml | head -1
```

Expect `200` on each. `robots.txt` names the sitemap; `sitemap-index.xml` points at
`sitemap-0.xml`, whose URLs must all begin with `https://hotdogbenchmark.lol/`. If they begin
with `https://en-dash-consulting.github.io/`, the build ran without `public/CNAME` and needs to run again.

Finally, open `https://hotdogbenchmark.lol/` in a browser, confirm the padlock, and paste the URL
into one social card validator to see `og/default.png` render.

## Traffic and hosting plan

GitHub Pages serves the built files from its CDN. The published limits are a soft
**100 GB per month** of bandwidth, a **1 GB** site size, and **10 builds per hour**. This site
is far inside all three, and the deploy workflow runs once per edition plus once per push to
`main`.

### Page weight

Measured from a build of the current site, counting the HTML plus the CSS, JavaScript and SVG it
references, before compression:

| Page                         | HTML    | Assets | Per view     |
| ---------------------------- | ------- | ------ | ------------ |
| Front page                   | 63 KB   | 41 KB  | **104 KB**   |
| A full report (`/reports/…`) | 192 KB  | 31 KB  | **223 KB**   |
| A framed report              | 126 KB  | 22 KB  | **148 KB**   |
| A prose page (about, method) | 8–26 KB | 17 KB  | **25–42 KB** |
| Average across all 25 pages  |         |        | **102 KB**   |

The two web fonts come from Google Fonts and do not count against Pages bandwidth. GitHub serves
everything gzipped, so the bytes on the wire are roughly a fifth of these figures; the numbers
above are the conservative case.

At **~105 KB per front-page view**, 100 GB is about **950,000 front-page views a month**. At
**~225 KB per full-report view**, it is about **450,000 report views a month**. A launch day that
sends 50,000 people to the front page uses about 5 GB. The OpenGraph cards are about 150 KB each
and are fetched by link previewers, not by readers.

### Why a spike cannot hurt the benchmark

There is no server, no database, and no AI call at runtime. The models are asked once a week by
the benchmark workflow, which commits a JSON file; the site is rebuilt from that file and served
as static HTML. A traffic spike costs nothing, cannot slow the benchmark, and cannot change a
number. The worst case is a slow page, not a wrong one.

### If it ever exceeds the limit

GitHub does not cut a site off at 100 GB; it sends an email and asks. If the site stays above
the limit, the escalation is one step:

1. **Put Cloudflare in front.** Add the domain to a free Cloudflare plan, move the nameservers
   to Cloudflare, recreate the records above with the orange cloud (proxied) switched on, and
   set a page rule or cache rule to **cache everything** with an edge TTL of a day. Cloudflare
   then answers almost every request from its own cache and GitHub sees a fraction of the
   traffic. The repository, the workflow, `public/CNAME` and the URLs all stay exactly as they
   are. Turn off Cloudflare's automatic minification and Rocket Loader; the site ships no
   JavaScript that needs help and the accessibility audit runs against the built files as they
   are.
2. Keep the GitHub Pages **Enforce HTTPS** setting on and set Cloudflare's SSL mode to
   **Full (strict)**, so the origin is still verified.

The optional proxy for the "Run your own" page already targets Cloudflare Workers (see
[`proxy.md`](proxy.md)), so if that page is ever switched on, both halves of the site live on the
same two providers.

See also: [`self-hosting.md`](self-hosting.md) for the generic custom-domain steps a fork would
follow, and [`launch-checklist.md`](launch-checklist.md) for everything else that is still to do.
