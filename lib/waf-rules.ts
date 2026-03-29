/**
 * WAF + Edge Security Configuration
 * Phase 2 Elite Hardening: Cloudflare Rules + Bot Protection
 * 
 * Deploy to: Cloudflare Workers / Cloudflare WAF Rules
 * Cost: Enterprise plan required for custom rules
 */

/**
 * CLOUDFLARE WAF RULES (Use Cloudflare Dashboard or Terraform)
 * 
 * Rule 1: Rate Limiting at Edge (Primary Layer)
 * - 100 requests per 10 second period from single IP
 * - Action: CHALLENGE (present CAPTCHA)
 * - Scope: (cf.threat_score >= 50) or (cf.bot_management.score <= 30)
 * 
 * Rule 2: Bot Management
 * - Enable Super Bot Fight Mode
 * - Definitely Automated: BLOCK
 * - Likely Automated: CHALLENGE
 * - Verified Bots: ALLOW (Google, Bing, etc.)
 * 
 * Rule 3: DDoS Protection
 * - Enable L7 DDoS
 * - Sensitivity: High (Lower false positives)
 * - Action: CHALLENGE
 * 
 * Rule 4: API Abuse Prevention
 * - Match: (http.host eq "api.yourdomain.com") AND (cf.bot_management.score < 50)
 * - Action: CHALLENGE
 * 
 * Rule 5: Geographic Restrictions (Optional)
 * - Block: Countries with known high abuse rates, VPN/Proxy origins
 * - Action: BLOCK or CHALLENGE
 * 
 * Rule 6: Suspicious Payload Detection
 * - Match: (http.request.body.size > 50000) AND (cf.threat_score > 70)
 * - Action: BLOCK
 * - Log: Send to SIEM
 * 
 * Rule 7: Credential Stuffing Protection
 * - Match: (http.request.method eq "POST") AND (http.request.uri.path contains "/auth")
 * - Rate Limit: 5 failed attempts per IP = BLOCK for 1 hour
 * - Requires: Cloudflare Advanced DDoS/Bot Management
 * 
 * Rule 8: API Key Leak Detection
 * - Pattern: Regex match for exposed API keys in requests
 * - Action: BLOCK + ALERT
 * - Patterns to block: "sk_live_", "NVIDIA_API_KEY=", "SUPABASE_KEY="
 */

export interface WafRuleConfig {
    name: string;
    description: string;
    cloudflareExpression: string;
    action: 'BLOCK' | 'CHALLENGE' | 'ALLOW' | 'LOG';
    priority: number;
    enabled: boolean;
}

export const WAF_RULES: WafRuleConfig[] = [
    {
        name: 'Rate Limit at Edge',
        description: 'Challenge IPs with >100 req/10s',
        cloudflareExpression: '(cf.threat_score >= 50) or (http.request.uri.path contains "/api/chat")',
        action: 'CHALLENGE',
        priority: 1,
        enabled: true,
    },
    {
        name: 'Block Confirmed Bots',
        description: 'Block automated abuse from known bot signatures',
        cloudflareExpression: '(cf.bot_management.score <= 30) and not (cf.verified_bot_category in {"Search Engine" "Monitoring"})',
        action: 'BLOCK',
        priority: 2,
        enabled: true,
    },
    {
        name: 'API Abuse Prevention',
        description: 'Challenge low-score bot traffic to API endpoints',
        cloudflareExpression: '(http.host contains "api") and (cf.bot_management.score < 50)',
        action: 'CHALLENGE',
        priority: 3,
        enabled: true,
    },
    {
        name: 'Oversized Payload Detection',
        description: 'Block suspiciously large payloads from low-trust IPs',
        cloudflareExpression: '(http.request.body.size > 100000) and (cf.threat_score > 70)',
        action: 'BLOCK',
        priority: 4,
        enabled: true,
    },
    {
        name: 'Key Leak Detection',
        description: 'Block requests containing exposed API key patterns',
        cloudflareExpression: '(http.request.body contains "sk_live_") or (http.request.body contains "NVIDIA_API_KEY=") or (http.request.headers["Authorization"] contains "sk_live_")',
        action: 'BLOCK',
        priority: 5,
        enabled: true,
    },
    {
        name: 'SQL/Code Injection',
        description: 'Block requests matching injection patterns',
        cloudflareExpression: '(http.request.body contains "union select") or (http.request.body contains "exec(") or (http.request.body contains "eval(")',
        action: 'BLOCK',
        priority: 6,
        enabled: true,
    },
    {
        name: 'VPN/Proxy Detection',
        description: 'Challenge requests from known VPN/proxy IPs',
        cloudflareExpression: 'cf.is_bot or cf.threat_score > 75',
        action: 'CHALLENGE',
        priority: 7,
        enabled: false, // Enable if you want strict geo controls
    },
];

/**
 * Terraform Configuration for Cloudflare WAF
 * Save as: waf.tf
 * 
 * terraform {
 *   required_providers {
 *     cloudflare = {
 *       source  = "cloudflare/cloudflare"
 *       version = "~> 4.0"
 *     }
 *   }
 * }
 * 
 * provider "cloudflare" {
 *   api_token = var.cloudflare_api_token
 * }
 * 
 * variable "cloudflare_zone_id" {}
 * variable "cloudflare_api_token" {
 *   sensitive = true
 * }
 * 
 * # Enable Super Bot Fight Mode
 * resource "cloudflare_bot_management" "main" {
 *   zone_id            = var.cloudflare_zone_id
 *   enabled            = true
 *   fight_mode         = true
 *   super_bot_fight_mode {
 *     definitely_automated = "block"
 *     likely_automated     = "challenge"
 *     likely_human         = "allow"
 *     verified_bots        = "allow"
 *   }
 * }
 * 
 * # Rate Limiting Rule
 * resource "cloudflare_rate_limit" "api_endpoint" {
 *   zone_id   = var.cloudflare_zone_id
 *   disabled  = false
 *   threshold = 100
 *   period    = 10
 *   match {
 *     request {
 *       url {
 *         path {
 *           matches = ["/api/chat"]
 *         }
 *       }
 *     }
 *   }
 *   action {
 *     timeout = 86400
 *     response_code = 429
 *     response {
 *       status_code = 429
 *       content_type = "text/plain"
 *       body = "Rate limited"
 *     }
 *   }
 * }
 */

/**
 * Vercel Edge Middleware Configuration (Alternative to Cloudflare)
 * Location: middleware.ts (at workspace root)
 * 
 * This is a BLUEPRINT - requires manual implementation
 */

export const ENDPOINT_MIDDLEWARE_BLUEPRINT = `
import { NextRequest, NextResponse } from 'next/server';
import GeoIP from 'geoip-lite';

export function middleware(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || '';
    const userAgent = request.headers.get('user-agent') || '';
    const path = request.nextUrl.pathname;

    // 1. GeoIP blocking
    const geo = GeoIP.lookup(ip);
    const blockedCountries = ['KP', 'IR']; // Example
    if (blockedCountries.includes(geo?.country || '')) {
        return new NextResponse('Access Denied', { status: 403 });
    }

    // 2. Bot detection (header-based heuristic)
    const botPatterns = [/bot|crawler|spider|curl|wget/i];
    if (botPatterns.some(p => p.test(userAgent))) {
        return new NextResponse('Bot access denied', { status: 403 });
    }

    // 3. Rate limiting (simple in-memory, scales via Redis middleware)
    const rateLimitKey = \`rate:\${ip}\`;
    // Check Redis, increment, check limit...
    // If exceeded: return 429

    // 4. API key leak detection
    const body = await request.clone().text();
    if (body.includes('NVIDIA_API_KEY=') || body.includes('sk_live_')) {
        return new NextResponse('Suspicious payload', { status: 400 });
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/api/(.*)', '/auth/(.*)'],
};
`;

/**
 * Alternative: AWS WAF Configuration (if using AWS Lambda)
 */
export const AWS_WAF_BLUEPRINT = `
{
  "Rules": [
    {
      "Name": "RateLimitRule",
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {
        "Block": {
          "CustomResponse": {
            "ResponseCode": 429,
            "CustomResponseBodyKey": "rate_limit_body"
          }
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimitRule"
      },
      "Priority": 0
    },
    {
      "Name": "GeoBlockingRule",
      "Statement": {
        "GeoMatchStatement": {
          "CountryCodes": ["KP", "IR"]
        }
      },
      "Action": {
        "Block": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "GeoBlockingRule"
      },
      "Priority": 1
    },
    {
      "Name": "SqliProtectionRule",
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesSQLiRuleSet"
        }
      },
      "OverrideAction": {
        "None": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "SqliRuleSet"
      },
      "Priority": 2
    }
  ]
}
`;

export default WAF_RULES;
