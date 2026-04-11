#!/usr/bin/env bash
# Deploy Vite build to S3 and invalidate CloudFront cache.
# Prerequisites: AWS CLI configured (aws configure), Node/npm, stack created from aws/cloudformation-s3-cloudfront.yaml
#
# Usage:
#   export S3_BUCKET=your-bucket-name
#   export CLOUDFRONT_DISTRIBUTION_ID=E123...
#   ./scripts/deploy-frontend.sh
#
# Loads (in order): .env.deploy, then .env — so VITE_* from .env are available for `npm run build`.
# For CloudFront + tunneled API: set VITE_API_URL=https://xxxx.trycloudflare.com (no path, no :8000).
# Rebuild and invalidate CloudFront after every tunnel restart (URL changes). Hard-refresh the browser.
# Optional: put S3_BUCKET and CLOUDFRONT_DISTRIBUTION_ID in .env.deploy (see repo root).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "${ROOT}/.env.deploy" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT}/.env.deploy"
  set +a
fi

if [[ -f "${ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT}/.env"
  set +a
fi

if [[ -z "${S3_BUCKET:-}" ]]; then
  echo "Set S3_BUCKET to the bucket name from CloudFormation output BucketName." >&2
  exit 1
fi

echo "==> npm ci (optional: use npm install if you prefer)"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

if [[ -n "${CLOUDFRONT_URL:-}" ]]; then
  export VITE_SITE_URL="${CLOUDFRONT_URL}"
  echo "==> VITE_SITE_URL=${VITE_SITE_URL} (from CLOUDFRONT_URL for Supabase email redirects)"
fi

if [[ -z "${VITE_API_URL:-}" ]]; then
  echo "WARN: VITE_API_URL is unset — the bundle will use http://localhost:8000; CloudFront cannot reach that (mixed content / SSL errors)." >&2
elif [[ "${VITE_API_URL}" == *"localhost"* ]] || [[ "${VITE_API_URL}" == *"127.0.0.1"* ]]; then
  echo "WARN: VITE_API_URL points at localhost — use your public tunnel URL (trycloudflare.com) for deployed builds." >&2
else
  echo "==> VITE_API_URL is set for production API (tunnel)"
fi

echo "==> vite build"
npm run build

echo "==> s3 sync"
aws s3 sync dist/ "s3://${S3_BUCKET}/" --delete

if [[ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]]; then
  echo "==> cloudfront invalidation"
  aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "/*" \
    --output text
else
  echo "CLOUDFRONT_DISTRIBUTION_ID not set; skipping invalidation (set it to clear CDN cache after deploys)."
fi

echo "Done. Open the CloudFront URL from stack Outputs (CloudFrontURL)."
