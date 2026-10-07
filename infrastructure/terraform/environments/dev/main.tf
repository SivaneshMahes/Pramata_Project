module "platform" {
  source = "../../modules/platform"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  project                     = var.project
  environment                 = var.environment
  region                      = var.region
  hosted_zone_name            = var.hosted_zone_name
  app_domain                  = var.app_domain
  github_repository           = var.github_repository
  create_github_oidc_provider = var.create_github_oidc_provider
  image_tag                   = var.image_tag

  az_count               = var.az_count
  single_nat_gateway     = var.single_nat_gateway
  task_cpu               = var.task_cpu
  task_memory            = var.task_memory
  desired_count          = var.desired_count
  min_count              = var.min_count
  max_count              = var.max_count
  log_retention_days     = var.log_retention_days
  cloudfront_price_class = var.cloudfront_price_class
  enable_api_docs        = var.enable_api_docs
  alarm_emails           = var.alarm_emails

  atlas_project_id    = var.atlas_project_id
  atlas_region        = var.atlas_region
  atlas_instance_size = var.atlas_instance_size
}
