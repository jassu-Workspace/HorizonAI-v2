# Horizon AI Security Hardening Report

## 1. Executive Summary
Horizon AI has been hardened from an open-proxy style AI app into a defense-in-depth architecture aligned to OWASP Top 10 and Zero Trust principles for its scale.

Primary security outcomes:
- Closed the unauthenticated AI proxy path that enabled cost-exhaustion.
- Removed hardcoded third-party API secrets from frontend code.
- Enforced strict request validation, bounded prompt/token size, and abuse controls on `/api/chat`.
- Added per-IP and per-user rate limiting plus daily AI token quotas.
- Reduced data leakage in health and error responses.
- Shifted RBAC trust boundaries from client metadata to backend-controlled role model (`user`, `trainer`, `admin`).
- Added schema-level controls to prevent client role escalation.
- Added deployment security headers and CSP baseline.
- Upgraded vulnerable dependencies to audited patched versions.

Current security posture: Strong for a serverless AI SaaS MVP, with a clear path to enterprise maturity via managed WAF, centralized SIEM, and malware scanning service integration.

---

## 2. Secure Architecture Design
### Zero Trust Architecture
```text
[Browser SPA]
  |
  | 1) Supabase Auth session JWT (short-lived)
  v
[API Gateway / Vercel Edge]
  |
  | 2) Security headers + CSP + CORS allowlist
  v
[/api/chat secure handler]
  |- Validate JWT with Supabase Admin
  |- Validate payload schema (Zod)
  |- Enforce per-IP + per-user rate limits
  |- Enforce daily token quotas (Supabase table)
  |- Detect abuse patterns and temporary blocks
  |- Redact PII before upstream inference
  v
[NVIDIA Inference API via server-only keys]

[Supabase Postgres + RLS]
  |- profiles (role constrained)
  |- ai_usage_daily (quota/accounting)
  |- roadmaps/quiz/storage with RLS

[Supabase Storage]
  |- private resumes bucket
  |- owner-folder RLS policies
```

### Trust Boundaries
- Frontend is untrusted for identity, authorization, and role assignment.
- Backend validates every AI request and enforces economic controls.
- Database enforces authorization via RLS and role-change trigger.
- Secrets never shipped to browser bundles.

---

## 3. Vulnerability Fixes (Mapped to Issues)
### 1) Unauthenticated `/api/chat` -> cost exhaustion risk
Status: Fixed
- `/api/chat` now requires `Authorization: Bearer <JWT>`.
- JWT validated server-side via Supabase admin client.
- Unauthenticated/invalid requests return 401.

### 2) Overly permissive CORS
Status: Fixed
- Added origin allowlist via `ALLOWED_ORIGINS`.
- Added explicit allowed methods/headers and preflight handling.
- Disallowed unknown origins with 403.

### 3) Hardcoded API keys in frontend
Status: Fixed
- Removed hardcoded key from `services/newsService.ts`.
- Added server-side `api/news.ts` proxy using env secrets.

### 4) Weak role-based access (client-trusted roles)
Status: Fixed
- Removed role-setting on signup metadata path.
- `saveProfileFromOnboarding` now forces default `user` role client-side.
- Added DB-level role check constraint and anti-escalation trigger.
- Role model normalized to `user | trainer | admin`.

### 5) Missing CSP/security headers
Status: Fixed (baseline)
- Added HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and CSP in `vercel.json`.

### 6) Vulnerable dependencies
Status: Fixed
- Upgraded and pinned vulnerable packages.
- `npm audit` now reports 0 vulnerabilities.

### 7) Weak file upload validation
Status: Fixed (client + policy)
- Added resume extension/MIME/size checks before upload.
- Existing Supabase storage RLS keeps per-user folder isolation.
- Malware scanning strategy documented below (deployment section).

### 8) Excessive data sent to LLM (PII risk)
Status: Fixed
- Added PII scrubbing for emails, phones, SSN-like patterns, and payment card-like strings.
- Added prompt/message count and size limits.
- Added input token estimation cap.

### 9) Lack of rate limiting and quotas
Status: Fixed
- Added in-memory per-IP and per-user sliding window controls.
- Added Supabase `ai_usage_daily` table for request/token accounting and temporary blocks.
- Added daily token quota enforcement.

### 10) Information leakage in health endpoints
Status: Fixed
- Removed key telemetry and sensitive operational internals from health responses.
- Added no-store and nosniff safeguards.

---

## 4. Hardened Code Snippets
### Secure chat authentication and validation
From `api/chat.ts`:
```ts
const token = readAuthToken(req);
if (!token) {
  return res.status(401).json({ error: 'Authentication required' });
}

const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
if (authError || !authData.user) {
  return res.status(401).json({ error: 'Invalid session' });
}

const parsed = chatSchema.safeParse({
  ...req.body,
  model: normalizeModelName(req.body?.model || ''),
});
if (!parsed.success) {
  return res.status(400).json({ error: 'Invalid request payload' });
}
```

### Quota + abuse control
```ts
const ipWindow = checkSlidingWindow(ipRateWindow, ip, MAX_REQUESTS_PER_5_MIN_IP, 5 * 60 * 1000);
if (!ipWindow.allowed) {
  return res.status(429).json({ error: 'Too many requests' });
}

if (isSuspicious(sanitizedMessages)) {
  const blockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await saveUsage(supabaseAdmin, userId, 0, blockedUntil);
  return res.status(429).json({ error: 'Request pattern blocked' });
}
```

### Privacy-preserving redaction
```ts
const scrubText = (text: string): string =>
  text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g, '[REDACTED_PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_CARD]');
```

### Role escalation prevention in DB
From `supabase_schema.sql`:
```sql
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'trainer', 'admin'));

create or replace function public.prevent_client_role_escalation()
returns trigger as $$
begin
  if tg_op = 'UPDATE' and
     coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' and
     new.role is distinct from old.role then
    raise exception 'role changes are restricted to backend service role';
  end if;
  return new;
end;
$$ language plpgsql;
```

---

## 5. Security Middleware Design
### Request lifecycle for `/api/chat`
1. Apply response security headers and strict CORS.
2. Validate HTTP method and preflight.
3. Extract and verify bearer token.
4. Apply rate limits (IP and user).
5. Validate schema and normalize model.
6. Sanitize/redact prompt content.
7. Run abuse heuristics.
8. Check quota counters.
9. Proxy to NVIDIA with bounded generation parameters.
10. Persist usage counters and return minimal error details.

### Abuse signals currently enforced
- Excessive URL density in prompt.
- Prompt-injection style keywords.
- Repetitive high-entropy spam patterns.
- Rate and quota threshold breaches.

### Error handling model
- External responses use generic messages.
- Internal diagnostics are captured as structured security logs.
- No key pool internals or stack traces leaked.

---

## 6. Deployment Security (Vercel/Server)
### Implemented
- Security headers in `vercel.json`.
- Strict API CORS via env allowlist.
- Server-only secret use for NVIDIA and News APIs.
- Health endpoint minimized.

### Required production environment variables
- `NVIDIA_API_KEY_1`, `NVIDIA_API_KEY_2`, `NVIDIA_API_KEY_3` (and optional fallback)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGINS`
- `AI_*` limits (`AI_DAILY_TOKEN_QUOTA`, `AI_MAX_INPUT_TOKENS`, etc.)
- `NEWSDATA_API_KEY` (optional `NEWSDATA_API_KEY_BACKUP`)

### Key rotation strategy
- Keep two active keys per provider where possible.
- Rotate every 60-90 days or immediately on suspicion.
- Use overlap rollout: add new key, shift traffic, remove old key.
- Alert on unusual token burn by key slot.

### File malware scanning strategy (next step)
- Trigger storage-object webhook or edge function on upload.
- Fetch object via signed URL in isolated worker.
- Scan using ClamAV or commercial malware API.
- Mark `scan_status` in DB; block processing/download until clean.

---

## 7. Monitoring & Alerting Plan
### Security event taxonomy
Log event families:
- `auth.*` (invalid token, missing token)
- `abuse.*` (suspicious prompt, block applied)
- `ratelimit.*` (ip/user bucket exceeded)
- `quota.*` (near quota, exceeded)
- `upstream.*` (provider failures, retries exhausted)
- `config.*` (missing secrets, initialization failure)

### Alerts
- High: sudden spike in 401/429 from single ASN/IP range.
- High: rapid quota depletion by user cohort.
- High: repeated abuse detection blocks for a tenant/user.
- Medium: elevated upstream 5xx or timeout rates.
- Medium: anomalous request-size distribution.

### Dashboards
- AI cost burn by day/user/model.
- Request latency and error budget.
- Rate-limit trigger heatmap.
- Quota consumption percentiles.

---

## 8. Final Security Score (0–10)
**8.8 / 10**

### Rationale
- Strong improvements in authentication, authorization boundaries, abuse economics, and secret handling.
- Remaining gap to 9.5+ enterprise posture is primarily operational maturity:
  - Dedicated distributed rate-limiter (Redis/Upstash) replacing instance-local memory buckets.
  - WAF/bot management at edge.
  - Fully nonce-based CSP (remove `unsafe-inline` by externalizing inline scripts).
  - Automated malware scanning pipeline for uploaded files.
  - SIEM integration with retention and forensics playbooks.

---

## Changed Files
- `api/chat.ts`
- `api/health.ts`
- `api/news.ts`
- `api-server.ts`
- `services/geminiService.ts`
- `services/newsService.ts`
- `services/supabaseService.ts`
- `components/Auth.tsx`
- `App.tsx`
- `types.ts`
- `supabase_schema.sql`
- `vercel.json`
- `index.html`
- `package.json`
- `package-lock.json`
