variable "name" {
  type = string
}

variable "region" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "service_name" {
  type = string
}

variable "log_group_name" {
  type = string
}

variable "alb_arn_suffix" {
  type = string
}

variable "target_group_arn_suffix" {
  type = string
}

variable "min_task_count" {
  type = number
}

variable "alarm_emails" {
  description = "Addresses subscribed to alarm notifications (each must confirm)."
  type        = list(string)
  default     = []
}
