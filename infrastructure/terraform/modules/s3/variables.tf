variable "name" {
  type = string
}

variable "bucket_suffix" {
  description = "Globally-unique suffix (e.g. account ID or random string) — not hard-coded."
  type        = string
}

variable "cloudfront_distribution_arn" {
  type = string
}

variable "upload_allowed_origins" {
  description = "Origins allowed to PUT presigned uploads (the app URL)."
  type        = list(string)
}

variable "force_destroy" {
  type    = bool
  default = false
}
