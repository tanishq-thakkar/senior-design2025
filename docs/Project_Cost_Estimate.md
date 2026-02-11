# UniSync Project Cost Estimate

**Project:** UniSync – AI-Powered Voice Assistant for UC Students  
**Estimation Date:** November 2025  
**AWS Region:** us-east-1 (recommended for best service availability)

---

## Cost Breakdown by Service

### 1. Amazon Cognito (Authentication)

**Purpose:** User authentication, OAuth with Google, Microsoft, Canvas

**Pricing:**
- **Free Tier:** 50,000 MAUs (Monthly Active Users) free forever
- **Beyond Free Tier:** $0.0055 per MAU

**Estimated Cost:**
- **MVP/Development:** $0/month (within free tier)
- **Production (100-500 students):** $0-2.75/month
- **Production (1,000 students):** ~$5.25/month

**Notes:** MAU = unique user who signs in during the month. For a senior design project, you'll likely stay within free tier.

---

### 2. AWS Lambda (Backend Functions)

**Purpose:** API handlers, OAuth callbacks, data processing

**Pricing:**
- **Free Tier:** 1M requests/month, 400,000 GB-seconds compute time
- **Beyond Free Tier:** 
  - $0.20 per 1M requests
  - $0.0000166667 per GB-second

**Estimated Cost:**
- **MVP/Development:** $0/month (within free tier)
- **Production (moderate usage):** $0-5/month
- **Production (high usage):** $5-20/month

**Notes:** Lambda is very cost-effective. Most student projects stay within free tier or pay minimal amounts.

---

### 3. Amazon API Gateway (REST + WebSocket)

**Purpose:** REST API endpoints, WebSocket for real-time chat/voice

**Pricing:**
- **REST API:**
  - Free Tier: 1M requests/month for 12 months
  - Beyond: $3.50 per 1M requests
- **WebSocket API:**
  - Free Tier: 1M messages/month for 12 months
  - Beyond: $1.00 per 1M messages + connection minutes

**Estimated Cost:**
- **MVP/Development:** $0/month (within free tier)
- **Production (REST only):** $0-10/month
- **Production (with WebSocket):** $5-25/month

**Notes:** WebSocket costs depend on concurrent connections and message volume. For voice streaming, this could be higher.

---

### 4. Amazon Bedrock (AI/LLM)

**Purpose:** Claude/Llama models for reasoning and chat responses

**Pricing:**
- **Claude 3 Haiku (recommended for MVP):**
  - Input: $0.25 per 1M tokens
  - Output: $1.25 per 1M tokens
- **Claude 3 Sonnet:**
  - Input: $3.00 per 1M tokens
  - Output: $15.00 per 1M tokens
- **Llama 2/3 (cheaper alternative):**
  - Input: $0.15-0.75 per 1M tokens
  - Output: $0.20-1.00 per 1M tokens

**Estimated Cost (per 1,000 queries, ~500 tokens input, ~1,000 tokens output):**
- **Claude Haiku:** ~$0.75-1.50 per 1,000 queries
- **Claude Sonnet:** ~$9-18 per 1,000 queries
- **Llama:** ~$0.50-1.00 per 1,000 queries

**Monthly Estimates:**
- **MVP (100 queries/day = 3,000/month):** $2-5/month (Haiku) or $27-54/month (Sonnet)
- **Production (1,000 queries/day = 30,000/month):** $22-45/month (Haiku) or $270-540/month (Sonnet)

**Notes:** This is likely your **largest cost**. Use Claude Haiku for MVP, optimize prompts to reduce token usage, and consider caching common responses.

---

### 5. Amazon Transcribe (Speech-to-Text)

**Purpose:** Convert voice input to text

**Pricing:**
- **Free Tier:** 60 minutes/month for 12 months
- **Beyond Free Tier:** $0.024 per minute

**Estimated Cost:**
- **MVP/Development:** $0/month (within free tier)
- **Production (100 minutes/day = 3,000/month):** ~$72/month
- **Production (500 minutes/day = 15,000/month):** ~$360/month

**Notes:** Consider using browser-based Web Speech API for MVP to reduce costs, then migrate to Transcribe for better accuracy.

---

### 6. Amazon Polly (Text-to-Speech)

**Purpose:** Voice responses from AI assistant

**Pricing:**
- **Free Tier:** 5M characters/month for 12 months
- **Beyond Free Tier:** $4.00 per 1M characters

**Estimated Cost:**
- **MVP/Development:** $0/month (within free tier)
- **Production (moderate usage):** $0-20/month
- **Production (high usage):** $20-100/month

**Notes:** 5M characters ≈ 350,000 words. Most projects stay within free tier.

---

### 7. Amazon DynamoDB (Database)

**Purpose:** Store user sessions, chat history, provider connections

**Pricing:**
- **Free Tier:** 25 GB storage, 25 read units, 25 write units (always free)
- **Beyond Free Tier:**
  - On-Demand: $1.25 per million read requests, $1.25 per million write requests
  - Storage: $0.25 per GB/month

**Estimated Cost:**
- **MVP/Development:** $0/month (within free tier)
- **Production (moderate usage):** $0-10/month
- **Production (high usage):** $10-50/month

**Notes:** DynamoDB is very cost-effective for small to medium projects. Free tier is generous.

---

### 8. Amazon OpenSearch (RAG/Vector Search)

**Purpose:** Semantic search for course documents, assignment retrieval

**Pricing:**
- **Free Tier:** None (but t3.small.search instances are ~$0.10/hour)
- **Minimum Setup:** t3.small.search (1 instance) = ~$72/month
- **Recommended:** t3.medium.search (1 instance) = ~$144/month

**Estimated Cost:**
- **MVP/Development:** $0/month (skip OpenSearch, use simple DynamoDB queries)
- **Production (with RAG):** $72-144/month

**Notes:** OpenSearch is optional for MVP. You can implement RAG later or use simpler search initially.

---

### 9. Amazon SageMaker (ML Models - Future)

**Purpose:** Intent classifier, re-ranker, NER models

**Pricing:**
- **Free Tier:** 250 hours/month of ml.t2.medium instances for 2 months
- **Beyond Free Tier:** ~$0.10-0.50/hour depending on instance type

**Estimated Cost:**
- **MVP/Development:** $0/month (skip SageMaker for MVP)
- **Production (if implemented):** $50-200/month

**Notes:** SageMaker is for future expansion. Not needed for MVP.

---

### 10. Data Transfer Costs

**Purpose:** Data egress from AWS

**Pricing:**
- **Free Tier:** 100 GB/month out to internet
- **Beyond Free Tier:** $0.09 per GB (first 10 TB)

**Estimated Cost:**
- **MVP/Development:** $0/month (within free tier)
- **Production:** $0-10/month

**Notes:** Most student projects stay within free tier.

---

### 11. CloudFront (CDN - Optional)

**Purpose:** Serve frontend static assets

**Pricing:**
- **Free Tier:** 1 TB data transfer out, 10M requests/month for 12 months
- **Beyond Free Tier:** $0.085 per GB (first 10 TB)

**Estimated Cost:**
- **MVP/Development:** $0/month (within free tier)
- **Production:** $0-5/month

**Notes:** Optional. You can host frontend on Vercel/Netlify for free instead.

---

### 12. Route 53 (Domain/DNS - Optional)

**Purpose:** Custom domain (e.g., unisync.uc.edu)

**Pricing:**
- **Hosted Zone:** $0.50/month
- **Domain Registration:** $12-15/year (if using Route 53)

**Estimated Cost:**
- **MVP/Development:** $0/month (use free subdomain or IP)
- **Production (with custom domain):** $0.50/month + domain cost

**Notes:** Optional. You can use free domains or university-provided subdomains.

---

## Total Cost Estimates

### Scenario 1: MVP / Development Phase (3-6 months)
**Target:** 10-50 test users, minimal usage

| Service | Monthly Cost |
|---------|--------------|
| Cognito | $0 (free tier) |
| Lambda | $0 (free tier) |
| API Gateway | $0 (free tier) |
| Bedrock (Claude Haiku) | $2-5 |
| Transcribe | $0 (free tier) |
| Polly | $0 (free tier) |
| DynamoDB | $0 (free tier) |
| OpenSearch | $0 (skip for MVP) |
| SageMaker | $0 (skip for MVP) |
| Data Transfer | $0 (free tier) |
| **TOTAL** | **$2-5/month** |

**Annual Cost:** ~$24-60

---

### Scenario 2: Production / Demo Phase (100-500 students)
**Target:** Moderate usage, full feature set

| Service | Monthly Cost |
|---------|--------------|
| Cognito | $0-3 |
| Lambda | $0-5 |
| API Gateway | $5-15 |
| Bedrock (Claude Haiku) | $20-40 |
| Transcribe | $0-72 (or use Web Speech API) |
| Polly | $0-20 |
| DynamoDB | $0-10 |
| OpenSearch | $0 (optional) |
| SageMaker | $0 (future) |
| Data Transfer | $0-5 |
| **TOTAL** | **$25-180/month** |

**Annual Cost:** ~$300-2,160

**Cost Optimization:** Use Web Speech API instead of Transcribe → **$25-110/month**

---

### Scenario 3: Full Production / Scale (1,000+ students)
**Target:** High usage, all features enabled

| Service | Monthly Cost |
|---------|--------------|
| Cognito | $5-10 |
| Lambda | $5-20 |
| API Gateway | $10-30 |
| Bedrock (Claude Haiku) | $50-100 |
| Transcribe | $100-300 |
| Polly | $20-50 |
| DynamoDB | $10-30 |
| OpenSearch | $72-144 (if enabled) |
| SageMaker | $0-100 (if enabled) |
| Data Transfer | $5-15 |
| **TOTAL** | **$277-809/month** |

**Annual Cost:** ~$3,324-9,708

**Cost Optimization Strategies:**
- Use Claude Haiku instead of Sonnet: **Save $200-400/month**
- Use Web Speech API instead of Transcribe: **Save $100-300/month**
- Skip OpenSearch initially: **Save $72-144/month**
- Optimize Bedrock prompts (shorter, cached): **Save $20-50/month**

**Optimized Total:** **$100-300/month**

---

## Cost Optimization Recommendations

### For MVP/Development:
1. ✅ **Use AWS Free Tier aggressively** - Most services have generous free tiers
2. ✅ **Use Claude Haiku** instead of Sonnet (10x cheaper, still very capable)
3. ✅ **Skip OpenSearch** - Use DynamoDB queries for MVP
4. ✅ **Skip SageMaker** - Implement ML features later
5. ✅ **Use Web Speech API** (browser-based) instead of Transcribe for MVP
6. ✅ **Cache common responses** to reduce Bedrock API calls
7. ✅ **Host frontend on Vercel/Netlify** (free) instead of CloudFront

### For Production:
1. ✅ **Implement response caching** - Cache common queries (e.g., "What's due this week?")
2. ✅ **Optimize prompts** - Shorter prompts = fewer tokens = lower costs
3. ✅ **Batch API calls** - Combine multiple Canvas/Calendar requests
4. ✅ **Use provisioned capacity** for DynamoDB if usage is predictable
5. ✅ **Monitor and set billing alerts** - AWS Budgets can alert at $10, $25, $50 thresholds
6. ✅ **Use AWS Cost Explorer** to track spending by service

---

## AWS Credits & Educational Discounts

### AWS Educate / AWS Academy
- **AWS Educate:** $75-200 in credits for students
- **AWS Academy:** Additional credits for academic projects
- **Contact:** UC IT or your professor to see if UC has AWS Academy partnership

### AWS Activate (Startups)
- Not applicable for student projects, but worth checking if you form a startup

### AWS Free Tier
- Most services have 12-month free tier
- Some services (Cognito, DynamoDB) have permanent free tier
- **Recommendation:** Use separate AWS accounts for development vs. production to maximize free tier usage

---

## Alternative Cost-Saving Strategies

### 1. Use Free/Cheaper Alternatives
- **Speech-to-Text:** Browser Web Speech API (free) → Transcribe later
- **Text-to-Speech:** Browser SpeechSynthesis API (free) → Polly later
- **Frontend Hosting:** Vercel/Netlify (free) instead of S3+CloudFront
- **Domain:** Use free subdomain or university-provided domain

### 2. Hybrid Approach
- **Development:** Use free alternatives (Web Speech API, browser TTS)
- **Production:** Migrate to AWS services (Transcribe, Polly) for better quality

### 3. Phased Rollout
- **Phase 1 (MVP):** Text-only chat, no voice → **$2-5/month**
- **Phase 2:** Add voice input (Web Speech API) → **$2-5/month**
- **Phase 3:** Add voice output (Polly) → **$2-25/month**
- **Phase 4:** Migrate to Transcribe → **$25-100/month**

---

## Budget Recommendations

### For Senior Design Project (6-12 months):

**Minimum Budget:** $50-100 total
- Covers MVP development and demo
- Most services in free tier
- Bedrock costs for testing

**Recommended Budget:** $200-500 total
- Covers full development cycle
- Allows for production testing
- Buffer for unexpected costs

**Ideal Budget:** $500-1,000 total
- Covers full production deployment
- Allows for scaling and optimization
- Includes domain and additional services

---

## Monitoring & Alerts

### Set Up AWS Budgets
1. Create budget alerts at $10, $25, $50, $100 thresholds
2. Monitor daily spending in AWS Cost Explorer
3. Set up CloudWatch billing alarms

### Cost Tracking
- Use AWS Cost Explorer to track spending by service
- Tag resources by project/environment (dev, prod)
- Review costs weekly during development

---

## Summary

**MVP/Development (Recommended):** **$2-5/month** (~$24-60/year)  
**Production Demo (100-500 students):** **$25-180/month** (~$300-2,160/year)  
**Full Production (1,000+ students):** **$100-300/month** (optimized) or **$277-809/month** (full features)

**Key Takeaway:** For a senior design project, you can build a fully functional MVP for **under $100 total** by leveraging AWS free tiers and cost optimization strategies. The largest cost driver is **Amazon Bedrock (AI)** - use Claude Haiku and optimize prompts to keep costs low.

---

**Last Updated:** November 2025  
**Next Review:** When moving to production phase



