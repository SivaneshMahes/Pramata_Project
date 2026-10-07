variable "project_id" {
  description = "Existing Atlas project ID."
  type        = string
}

variable "cluster_name" {
  type = string
}

variable "region" {
  description = "Atlas region name close to the ECS region, e.g. AP_SOUTH_1."
  type        = string
}

variable "instance_size" {
  description = "M0 for a free dev cluster; M10+ for production (dedicated, backups)."
  type        = string
  default     = "M10"
}

variable "max_instance_size" {
  description = "Upper bound for compute auto-scaling (dedicated tiers)."
  type        = string
  default     = "M30"
}

variable "backup_enabled" {
  description = "Continuous cloud backups (dedicated tiers only)."
  type        = bool
  default     = true
}

variable "allowed_cidrs" {
  description = "CIDRs allowed to connect (the VPC NAT IPs as /32)."
  type        = list(string)
}

variable "database_name" {
  type    = string
  default = "vehicle_rental"
}

variable "database_username" {
  type    = string
  default = "vehicle-rental-api"
}
