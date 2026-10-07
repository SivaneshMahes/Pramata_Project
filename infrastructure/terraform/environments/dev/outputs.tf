output "app_url" {
  value = module.platform.app_url
}

output "ecr_repository_url" {
  value = module.platform.ecr_repository_url
}

output "ecs_cluster_name" {
  value = module.platform.ecs_cluster_name
}

output "ecs_service_name" {
  value = module.platform.ecs_service_name
}

output "ecs_task_family" {
  value = module.platform.ecs_task_family
}

output "web_bucket_name" {
  value = module.platform.web_bucket_name
}

output "cloudfront_distribution_id" {
  value = module.platform.cloudfront_distribution_id
}

output "deploy_role_arn" {
  value = module.platform.deploy_role_arn
}

output "api_secret_name" {
  value = module.platform.api_secret_name
}

output "nat_public_ips" {
  value = module.platform.nat_public_ips
}

output "mongodb_uri" {
  value     = module.platform.mongodb_uri
  sensitive = true
}
