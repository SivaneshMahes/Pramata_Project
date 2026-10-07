variable "name" {
  type = string
}

variable "region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "target_group_arn" {
  type = string
}

variable "alb_arn_suffix" {
  type = string
}

variable "target_group_arn_suffix" {
  type = string
}

variable "repository_url" {
  type = string
}

variable "image_tag" {
  description = "Image tag for the initial task definition; CI deploys later revisions."
  type        = string
}

variable "container_port" {
  type    = number
  default = 4000
}

variable "cpu" {
  description = "Fargate task CPU units (256 = 0.25 vCPU)."
  type        = number
  default     = 512
}

variable "memory" {
  description = "Fargate task memory (MiB)."
  type        = number
  default     = 1024
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

variable "cpu_target_percent" {
  type    = number
  default = 60
}

variable "memory_target_percent" {
  type    = number
  default = 75
}

variable "requests_per_target" {
  description = "ALB requests per task per minute before scaling out."
  type        = number
  default     = 1000
}

variable "execution_role_arn" {
  type = string
}

variable "task_role_arn" {
  type = string
}

variable "app_secret_arn" {
  type = string
}

variable "environment" {
  description = "Non-secret environment variables for the container."
  type        = map(string)
}

variable "log_retention_days" {
  type    = number
  default = 30
}
