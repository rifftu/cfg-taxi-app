# Deployment

This app is a Next.js project. Vercel is a hosting service that can build and
run Next.js apps without you managing servers.

## What You Need

- A Vercel account: https://vercel.com/signup
- A Git provider account that Vercel can read from, usually GitHub.
- This project pushed to a remote Git repository.
- These environment variables from `.env.local`:

```text
OPENAI_API_KEY
OPENAI_MODEL
CLICKHOUSE_HOST
CLICKHOUSE_USERNAME
CLICKHOUSE_PASSWORD
CLICKHOUSE_DATABASE
CLICKHOUSE_TABLE
```

Use these non-secret values unless you intentionally changed them:

```text
OPENAI_MODEL=gpt-5-nano
CLICKHOUSE_DATABASE=default
CLICKHOUSE_TABLE=nyc_taxi
```

Do not commit `.env.local`. Add the secret values in Vercel instead.

## Before Deploying

Run the local checks:

```bash
npm ci
npm run verify
npm run verify:live
```

`npm run verify` checks the app without live services. `npm run verify:live`
confirms OpenAI and ClickHouse work with your local credentials.

## Protect Your OpenAI Budget With Vercel Rate Limiting

You should set up rate limiting before sharing the deployed URL. This app sends
requests to OpenAI from the server, so a public demo link can spend your API
balance if people spam the prompt.

Important limitation: Vercel WAF rate limiting is not a true global 5-hour
sliding-window spend cap on normal plans. Vercel supports fixed-window rate
limits on Hobby/Pro plans. Enterprise can use token bucket, but Vercel's own
rate-limit counters are still tracked per region. That means Vercel WAF is a
good abuse brake, but your final emergency brake should still be an OpenAI
project budget/limit.

### Back-Of-The-Napkin Budget

Assumptions:

- Model: `gpt-5-nano`
- Pricing: about `$0.05 / 1M input tokens` and `$0.40 / 1M output tokens`
- Conservative query estimate: `5,000` input tokens plus `2,000` output tokens

Estimated cost per query:

```text
input:   5,000 / 1,000,000 * $0.05 = $0.00025
output:  2,000 / 1,000,000 * $0.40 = $0.00080
total:                                $0.00105
```

Round that up to `$0.002/query` to leave room for reasoning tokens, retries, and
pricing drift.

With that cushion:

```text
$1.00 / $0.002 per query = about 500 queries
```

To make `$10` last at least `48` hours:

```text
48 hours / 5-hour budget windows = 9.6 windows
9.6 windows * $1/window = $9.60
```

So the target budget is roughly:

```text
500 queries per 5 hours total
about 100 queries per hour total
about 16 queries per 10 minutes total
```

Because Vercel WAF does not provide a true global 5-hour sliding window here, use
a conservative per-user/IP rule and also configure an OpenAI budget limit.

### Recommended Vercel WAF Rule

Start with this rule:

```text
Path: /api/query
Method: POST
Action: Rate Limit
Algorithm: Fixed Window
Window: 10 minutes
Limit: 10 requests
Key: IP address
When exceeded: return 429 / rate limit response
```

Why `10 requests / 10 minutes / IP`?

- It still lets one person click a bunch of example prompts quickly.
- One IP can spend at most about `300 requests` in 5 hours.
- At the padded `$0.002/query`, that is about `$0.60` per IP per 5 hours.
- It is not a perfect total spend cap, but it makes one person unable to burn the
  whole account.

If you expect a bigger public audience, lower it to:

```text
5 requests / 10 minutes / IP
```

If the demo is only for a few trusted people, you can raise it to:

```text
20 requests / 10 minutes / IP
```

### How To Add The Rule In Vercel

1. Open your project in Vercel.
2. Go to **Firewall**.
3. Open **WAF** or **Custom Rules**.
4. Click **Create Rule**.
5. Name it: `Rate limit taxi query API`.
6. Add conditions:
   - Request Path equals `/api/query`
   - Request Method equals `POST`
7. Set the action to **Rate Limit**.
8. Pick **Fixed Window**.
9. Set the window to `10 minutes`.
10. Set request limit to `10`.
11. Set the key/counting source to **IP address**.
12. Set the exceeded action to **Rate Limit** or **Deny**.
13. Save the rule.
14. Publish/apply the firewall changes.

### OpenAI Budget Safety Net

Also set an OpenAI project budget or usage limit:

1. Open the OpenAI dashboard.
2. Go to project billing/limits.
3. Set a low project budget, for example `$10`.
4. Add an alert around `$5` if available.

This matters because Vercel's WAF rule is per source and per region, not a
guaranteed global dollar cap.

## Deploy With The Vercel Website

1. Go to https://vercel.com and sign in.
2. Click **Add New...**.
3. Click **Project**.
4. Connect your Git provider if Vercel asks.
5. Select this repository.
6. Vercel should detect **Framework Preset: Next.js** automatically.
7. Leave the default build settings:
   - Build Command: `npm run build`
   - Install Command: `npm install` or `npm ci`
   - Output Directory: leave blank/default
8. Open **Environment Variables**.
9. Add each variable listed in **What You Need**.
10. Click **Deploy**.

When deploy finishes, Vercel gives you a public URL. Open that URL and try the
example prompt buttons.

## Deploy With The CLI

Use this only if you prefer terminal prompts.

```bash
npm exec vercel
```

The first run asks you to log in and link the folder to a Vercel project. For a
production deploy:

```bash
npm exec vercel --prod
```

You still need to add environment variables in Vercel. The website is usually
easier for that.

## After Deploying

1. Open the deployed URL.
2. Ask: `Sum the total amount for taxi trips in the last 30 hours.`
3. Confirm the page shows CFG executable SQL and a clearly labeled non-CFG
   comparison SQL.
4. Click **Run against ClickHouse**.
5. Confirm the page shows at least one result row.
6. Try: `What's the weather in Paris tomorrow?`
7. Confirm the page shows the rejection message.

## Troubleshooting

- **Build failed**: run `npm run verify` locally and fix the first failing
  command.
- **The deployed app says it cannot generate SQL**: check `OPENAI_API_KEY` and
  `OPENAI_MODEL` in Vercel.
- **The deployed app says it cannot execute the query**: check ClickHouse env
  vars in Vercel and confirm ClickHouse allows connections from Vercel.
- **It works locally but not in Vercel**: compare `.env.local` with Vercel's
  Environment Variables page. Do not paste secrets into code or docs.
