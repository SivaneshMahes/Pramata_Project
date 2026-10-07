variable "project" {
  type    = string
  default = "vrp"
}

variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be dev or prod."
  }
}

variable "region" {
  type = string
}

variable "hosted_zone_name" {
  description = "Existing Route 53 public hosted zone."
  type        = string
}

variable "app_domain" {
  description = "Public hostname for the app (e.g. app.example.com or dev.example.com)."
  type        = string
}

variable "api_origin_subdomain" {
  description = "Prefix for the ALB origin hostname (origin.<app_domain>)."
  type        = string
  default     = "origin"
}

variable "github_repository" {
  description = "owner/repo that may deploy via OIDC."
  type        = string
}

variable "create_github_oidc_provider" {
  type    = bool
  default = false
}

variable "image_tag" {
  description = "Initial API image tag. CI deploys subsequent tags."
  type        = string
  default     = "bootstrap"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "az_count" {
  type    = number
  default = 2
}

variable "single_nat_gateway" {
  type    = bool
  default = false
}

variable "task_cpu" {
  type    = number
  default = 512
}

variable "task_memory" {
  type    = number
  default = 1024
}

variable "desired_count" {
  type    = number
  default = 2
}

variable "min_count" {
  type    = number
  default = 2
}

variable "max_count" {
  type    = number
  default = 6
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "cloudfront_price_class" {
  type    = string
  default = "PriceClass_200"
}

variable "business_timezone" {
  type    = string
  default = "Asia/Kolkata"
}

variable "enable_api_docs" {
  type    = bool
  default = true
}

variable "alarm_emails" {
  type    = list(string)
  default = []
}

variable "atlas_project_id" {
  description = "Atlas project to manage the cluster in. Empty = manage Atlas outside Terraform."
  type        = string
  default     = ""
}

variable "atlas_region" {
  description = "Atlas region matching the AWS region, e.g. AP_SOUTH_1."
  type        = string
  default     = "AP_SOUTH_1"
}

variable "atlas_instance_size" {
  type    = string
  default = "M10"
}
