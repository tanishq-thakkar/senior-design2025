#!/usr/bin/env bash
# Deploy Vite build to S3 and invalidate CloudFront cache.
# Prerequisites: AWS CLI configured (aws configure), Node/npm, stack created from aws/cloudformation-s3-cloudfront.yaml
#
# Usage:
#   export S3_BUCKET=your-bucket-name
#   export CLOUDFRONT_DISTRIBUTION_ID=E123...
#   ./scripts/deploy-frontend.sh
#
# Optional: create .env.production with VITE_API_URL, VITE_SUPABASE_* then: npm run build uses them automatically.
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
