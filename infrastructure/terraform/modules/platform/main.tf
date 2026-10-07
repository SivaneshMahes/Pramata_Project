terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.us_east_1]
    }
    random = {
      source = "hashicorp/random"
    }
    mongodbatlas = {
      source = "mongodb/mongodbatlas"
    }
  }
}

# The whole stack for one environment. dev and prod call this with different
# sizing; nothing here is environment-specific or account-specific.

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  name              = "${var.project}-${var.environment}"
  api_origin_domain = "${var.api_origin_subdomain}.${var.app_domain}"
  app_url           = "https://${var.app_domain}"
  container_port    = 4000
}

# Shared secret CloudFront sends to the ALB; the ALB rejects requests without it.
resource "random_password" "origin_verify" {
  length  = 48
  special = false
}

# Runtime secrets. Terraform creates the container only — values are written
# out-of-band (see docs/deployment.md) so they never enter Terraform state.
resource "aws_secretsmanager_secret" "api" {
  name                    = "${local.name}/api"
  description             = "MONGODB_URI, JWT_SECRET, GOOGLE_CLIENT_ID for the ${var.environment} API"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

module "vpc" {
  source             = "../vpc"
  name               = local.name
  region             = var.region
  cidr_block         = var.vpc_cidr
  az_count           = var.az_count
  single_nat_gateway = var.single_nat_gateway
}

module "ecr" {
  source       = "../ecr"
  name         = local.name
  force_delete = var.environment != "prod"
}

module "dns" {
  source = "../dns"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
  hosted_zone_name          = var.hosted_zone_name
  app_domain                = var.app_domain
  api_origin_domain         = local.api_origin_domain
  cloudfront_domain_name    = module.cloudfront.domain_name
  cloudfront_hosted_zone_id = module.cloudfront.hosted_zone_id
  alb_dns_name              = module.alb.alb_dns_name
  alb_zone_id               = module.alb.alb_zone_id
}

module "alb" {
  source                     = "../alb"
  name                       = local.name
  vpc_id                     = module.vpc.vpc_id
  public_subnet_ids          = module.vpc.public_subnet_ids
  certificate_arn            = module.dns.origin_certificate_arn
  target_port                = local.container_port
  target_security_group_id   = module.ecs.task_security_group_id
  origin_verify_header_value = random_password.origin_verify.result
  deletion_protection        = var.environment == "prod"
}

module "s3" {
  source                      = "../s3"
  name                        = local.name
  bucket_suffix               = data.aws_caller_identity.current.account_id
  cloudfront_distribution_arn = module.cloudfront.distribution_arn
  upload_allowed_origins      = [local.app_url]
  force_destroy               = var.environment != "prod"
}

module "cloudfront" {
  source                            = "../cloudfront"
  name                              = local.name
  domain_name                       = var.app_domain
  certificate_arn                   = module.dns.cdn_certificate_arn
  web_bucket_regional_domain_name   = module.s3.web_bucket_regional_domain_name
  media_bucket_regional_domain_name = module.s3.media_bucket_regional_domain_name
  media_upload_host                 = "${module.s3.media_bucket_name}.s3.${var.region}.amazonaws.com"
  api_origin_domain                 = local.api_origin_domain
  origin_verify_header_value        = random_password.origin_verify.result
  price_class                       = var.cloudfront_price_class
}

module "iam" {
  source                      = "../iam"
  name                        = local.name
  app_secret_arn              = aws_secretsmanager_secret.api.arn
  media_bucket_arn            = module.s3.media_bucket_arn
  web_bucket_arn              = module.s3.web_bucket_arn
  ecr_repository_arn          = module.ecr.repository_arn
  ecs_service_arn             = module.ecs.service_arn
  cloudfront_distribution_arn = module.cloudfront.distribution_arn
  github_repository           = var.github_repository
  github_environment          = var.environment
  create_github_oidc_provider = var.create_github_oidc_provider
}

module "ecs" {
  source                  = "../ecs"
  name                    = local.name
  region                  = var.region
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  alb_security_group_id   = module.alb.security_group_id
  target_group_arn        = module.alb.target_group_arn
  alb_arn_suffix          = module.alb.alb_arn_suffix
  target_group_arn_suffix = module.alb.target_group_arn_suffix
  repository_url          = module.ecr.repository_url
  image_tag               = var.image_tag
  container_port          = local.container_port
  cpu                     = var.task_cpu
  memory                  = var.task_memory
  desired_count           = var.desired_count
  min_count               = var.min_count
  max_count               = var.max_count
  execution_role_arn      = module.iam.execution_role_arn
  task_role_arn           = module.iam.task_role_arn
  app_secret_arn          = aws_secretsmanager_secret.api.arn
  log_retention_days      = var.log_retention_days
  environment = {
    NODE_ENV           = "production"
    PORT               = tostring(local.container_port)
    LOG_LEVEL          = "info"
    LOG_FORMAT         = "json"
    COOKIE_SECURE      = "true"
    TRUST_PROXY        = "2" # CloudFront → ALB
    CORS_ORIGINS       = local.app_url
    BUSINESS_TIMEZONE  = var.business_timezone
    RATE_LIMIT_ENABLED = "true"
    ENABLE_JOBS        = "true"
    ENABLE_API_DOCS    = tostring(var.enable_api_docs)
    S3_BUCKET          = module.s3.media_bucket_name
    S3_REGION          = var.region
    S3_PUBLIC_BASE_URL = "${local.app_url}/media"
  }
}

module "monitoring" {
  source                  = "../monitoring"
  name                    = local.name
  region                  = var.region
  cluster_name            = module.ecs.cluster_name
  service_name            = module.ecs.service_name
  log_group_name          = module.ecs.log_group_name
  alb_arn_suffix          = module.alb.alb_arn_suffix
  target_group_arn_suffix = module.alb.target_group_arn_suffix
  min_task_count          = var.min_count
  alarm_emails            = var.alarm_emails
}

module "atlas" {
  source        = "../atlas"
  count         = var.atlas_project_id == "" ? 0 : 1
  project_id    = var.atlas_project_id
  cluster_name  = local.name
  region        = var.atlas_region
  instance_size = var.atlas_instance_size
  allowed_cidrs = [for ip in module.vpc.nat_public_ips : "${ip}/32"]
}
