variable "name" {
  type = string
}

variable "app_secret_arn" {
  description = "Secrets Manager secret injected into the task."
  type        = string
}

variable "media_bucket_arn" {
  type = string
}

variable "web_bucket_arn" {
  type = string
}

variable "ecr_repository_arn" {
  type = string
}

variable "ecs_service_arn" {
  description = "ARN of the ECS service the deploy role may update."
  type        = string
}

variable "cloudfront_distribution_arn" {
  type = string
}

variable "github_repository" {
  description = "owner/repo allowed to assume the deploy role."
  type        = string
}

variable "github_environment" {
  description = "GitHub Actions environment name (e.g. dev, prod)."
  type        = string
}

variable "create_github_oidc_provider" {
  description = "Create the account-wide GitHub OIDC provider (only once per AWS account)."
  type        = bool
  default     = false
}
