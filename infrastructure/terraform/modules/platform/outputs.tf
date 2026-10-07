output "app_url" {
  value = local.app_url
}

output "ecr_repository_url" {
  value = module.ecr.repository_url
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_service_name" {
  value = module.ecs.service_name
}

output "ecs_task_family" {
  value = module.ecs.task_definition_family
}

output "web_bucket_name" {
  value = module.s3.web_bucket_name
}

output "media_bucket_name" {
  value = module.s3.media_bucket_name
}

output "cloudfront_distribution_id" {
  value = module.cloudfront.distribution_id
}

output "deploy_role_arn" {
  value = module.iam.deploy_role_arn
}

output "api_secret_name" {
  value = aws_secretsmanager_secret.api.name
}

output "nat_public_ips" {
  value = module.vpc.nat_public_ips
}

output "alarm_topic_arn" {
  value = module.monitoring.alarm_topic_arn
}

output "mongodb_uri" {
  value     = try(module.atlas[0].mongodb_uri, null)
  sensitive = true
}
