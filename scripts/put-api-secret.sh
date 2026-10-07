#!/usr/bin/env bash
# Writes the API's runtime secrets to AWS Secrets Manager, outside Terraform so
# the values never land in state or in the repository. Prompts for MONGODB_URI
# (input hidden) and generates a fresh JWT_SECRET unless one is provided.
#
#   ./scripts/put-api-secret.sh vrp-prod/api [google-client-id]
set -euo pipefail

SECRET_ID="${1:?usage: put-api-secret.sh <secret-name> [google-client-id]}"
GOOGLE_CLIENT_ID="${2:-}"

read -r -s -p "MONGODB_URI: " MONGODB_URI
echo
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48 | tr -d '\n')}"

PAYLOAD="$(MONGODB_URI="$MONGODB_URI" JWT_SECRET="$JWT_SECRET" GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  node -e 'process.stdout.write(JSON.stringify({MONGODB_URI:process.env.MONGODB_URI,JWT_SECRET:process.env.JWT_SECRET,GOOGLE_CLIENT_ID:process.env.GOOGLE_CLIENT_ID}))')"

aws secretsmanager put-secret-value --secret-id "$SECRET_ID" --secret-string "$PAYLOAD" >/dev/null
echo "Updated $SECRET_ID. Redeploy the ECS service for tasks to pick it up:"
echo "  aws ecs update-service --cluster <cluster> --service <service> --force-new-deployment"
