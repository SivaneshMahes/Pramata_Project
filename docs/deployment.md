# Deploying to AWS

End-to-end first rollout for one environment (`dev` shown; repeat with `prod`). Everything is driven by Terraform and GitHub Actions; the only manual steps are one-time bootstrap and writing secrets.

## Prerequisites

- AWS account with an existing **Route 53 public hosted zone** for your domain.
- Terraform ≥ 1.6, AWS CLI v2, Node 22, Docker.
- MongoDB Atlas organisation + project (and an Atlas programmatic API key if Terraform should manage the cluster).
- The repository on GitHub with Actions enabled.

## 1. Remote state (once per account)

```bash
aws s3api create-bucket --bucket <state-bucket> --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
aws s3api put-bucket-versioning --bucket <state-bucket> --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket <state-bucket> \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws dynamodb create-table --table-name terraform-locks --billing-mode PAY_PER_REQUEST \
  --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH
```

## 2. Configure the environment

```bash
cd infrastructure/terraform/environments/dev
cp backend.hcl.example backend.hcl          # state bucket / key / lock table
cp terraform.tfvars.example terraform.tfvars # region, hosted zone, app domain, GitHub repo
```

- `create_github_oidc_provider = true` in exactly **one** stack per AWS account (the provider is account-wide).
- To let Terraform manage Atlas, set `atlas_project_id` (and `atlas_instance_size`, `atlas_region`) and export `MONGODB_ATLAS_PUBLIC_KEY` / `MONGODB_ATLAS_PRIVATE_KEY`. Otherwise create the cluster in Atlas (M10+ with backups for prod, region next to ECS) and add the NAT IPs from `terraform output nat_public_ips` to its network access list.

## 3. Apply

```bash
terraform init -backend-config=backend.hcl
terraform apply
```

The ECS service starts with `image_tag = "bootstrap"`, which doesn't exist yet — tasks will fail to start until the first pipeline run pushes an image. That's expected; the circuit breaker keeps the service stable and the first deploy replaces the task definition.

## 4. Write the runtime secrets (never via Terraform)

```bash
# MONGODB_URI is prompted (hidden). With managed Atlas: terraform output -raw mongodb_uri
./scripts/put-api-secret.sh "$(terraform output -raw api_secret_name)" "<google-client-id-or-empty>"
```

The secret is JSON with `MONGODB_URI`, `JWT_SECRET` (generated if not provided) and `GOOGLE_CLIENT_ID`. ECS injects each key into the container at start. Rotate by re-running the script and forcing a new deployment.

## 5. GitHub environment

Create a GitHub **environment** named `dev` (and `prod` with required reviewers). Add these **variables** (not secrets — none of them are sensitive) from `terraform output`:

| Variable                     | Source                           |
| ---------------------------- | -------------------------------- |
| `AWS_REGION`                 | your region                      |
| `AWS_DEPLOY_ROLE_ARN`        | `deploy_role_arn`                |
| `ECR_REPOSITORY_URL`         | `ecr_repository_url`             |
| `ECS_CLUSTER`                | `ecs_cluster_name`               |
| `ECS_SERVICE`                | `ecs_service_name`               |
| `ECS_TASK_FAMILY`            | `ecs_task_family`                |
| `WEB_BUCKET`                 | `web_bucket_name`                |
| `CLOUDFRONT_DISTRIBUTION_ID` | `cloudfront_distribution_id`     |
| `APP_URL`                    | `app_url`                        |
| `GOOGLE_CLIENT_ID`           | optional, public OAuth client ID |

No AWS keys are stored in GitHub: the workflow assumes the deploy role through OIDC, and the role trusts only this repository's matching environment.

## 6. Deploy

Push to `main` (→ dev) or run **Deploy** manually and choose `prod`. The pipeline:

1. lint → typecheck → test → build (the job stops on any failure)
2. build and push `api:<git-sha>` to ECR
3. register a task definition revision with the new image; ECS rolling deploy; wait for stability (automatic rollback on failed health checks)
4. build the SPA, `s3 sync` (immutable hashed assets, no-cache `index.html`), CloudFront invalidation
5. `scripts/health-check.sh $APP_URL` — API health through CloudFront → ALB → ECS, the home page, and an SPA deep link

## 7. Seed demo data (dev only)

The seed script refuses to run with `NODE_ENV=production`. To seed a dev Atlas database from your machine:

```bash
MONGODB_URI='<dev uri>' JWT_SECRET='<any 32+ chars>' NODE_ENV=development npm run seed
```

## Operations

- **Logs:** CloudWatch Logs group `/ecs/vrp-<env>/api` (JSON; query with Logs Insights).
- **Dashboard:** `vrp-<env>-overview`. **Alarms** notify the SNS topic (`alarm_emails` subscribers must confirm).
- **Scale:** adjust `min_count` / `max_count` / `task_cpu` / `task_memory` and apply. Autoscaling tracks CPU, memory and requests per task.
- **Rollback:** re-run **Deploy** for an earlier commit, or `aws ecs update-service --task-definition <family>:<previous revision>`.
- **Destroy dev:** `terraform destroy` (prod has deletion protection on the ALB and a 30-day secret recovery window).
