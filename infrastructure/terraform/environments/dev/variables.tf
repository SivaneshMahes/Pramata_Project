variable "project" {
  type    = string
  default = "vrp"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "region" {
  description = "AWS region for the stack (close to the Atlas cluster)."
  type        = string
}

variable "hosted_zone_name" {
  type = string
}

variable "app_domain" {
  type = string
}

variable "github_repository" {
  type = string
}

variable "create_github_oidc_provider" {
  type    = bool
  default = true
}

variable "image_tag" {
  type    = string
  default = "bootstrap"
}

variable "az_count" {
  type    = number
  default = 2
}

variable "single_nat_gateway" {
  type    = bool
  default = true
}

variable "task_cpu" {
  type    = number
  default = 256
}

variable "task_memory" {
  type    = number
  default = 512
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "min_count" {
  type    = number
  default = 1
}

variable "max_count" {
  type    = number
  default = 2
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "cloudfront_price_class" {
  type    = string
  default = "PriceClass_100"
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
  description = "Leave empty to manage the Atlas cluster outside Terraform."
  type        = string
  default     = ""
}

variable "atlas_region" {
  type    = string
  default = "AP_SOUTH_1"
}

variable "atlas_instance_size" {
  type    = string
  default = "M0"
}
