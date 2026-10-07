variable "name" {
  type = string
}

variable "keep_images" {
  description = "How many recent images to retain for rollbacks."
  type        = number
  default     = 30
}

variable "force_delete" {
  description = "Allow destroying the repository while it still holds images (dev only)."
  type        = bool
  default     = false
}
