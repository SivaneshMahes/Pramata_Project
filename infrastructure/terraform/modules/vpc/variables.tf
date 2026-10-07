variable "name" {
  description = "Name prefix for all resources."
  type        = string
}

variable "region" {
  description = "AWS region (for VPC endpoint service names)."
  type        = string
}

variable "cidr_block" {
  description = "VPC CIDR."
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones (2 minimum for an ALB)."
  type        = number
  default     = 2
  validation {
    condition     = var.az_count >= 2 && var.az_count <= 4
    error_message = "az_count must be between 2 and 4."
  }
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway for all AZs (cheaper, not AZ-resilient)."
  type        = bool
  default     = false
}
