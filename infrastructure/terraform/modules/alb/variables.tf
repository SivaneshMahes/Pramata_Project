variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "certificate_arn" {
  description = "Regional ACM certificate for the ALB origin hostname."
  type        = string
}

variable "target_port" {
  type    = number
  default = 4000
}

variable "target_security_group_id" {
  description = "Security group of the ECS tasks (egress target)."
  type        = string
}

variable "origin_verify_header_name" {
  type    = string
  default = "X-Origin-Verify"
}

variable "origin_verify_header_value" {
  description = "Shared secret CloudFront sends to the ALB."
  type        = string
  sensitive   = true
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "access_logs_bucket" {
  type    = string
  default = null
}
