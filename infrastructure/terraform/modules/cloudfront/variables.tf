variable "name" {
  type = string
}

variable "domain_name" {
  description = "Public app hostname, e.g. app.example.com."
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate in us-east-1 covering domain_name."
  type        = string
}

variable "web_bucket_regional_domain_name" {
  type = string
}

variable "media_bucket_regional_domain_name" {
  type = string
}

variable "media_upload_host" {
  description = "S3 host browsers PUT photos to (for the CSP connect-src)."
  type        = string
}

variable "api_origin_domain" {
  description = "Hostname of the ALB origin (must match the ALB certificate)."
  type        = string
}

variable "origin_verify_header_name" {
  type    = string
  default = "X-Origin-Verify"
}

variable "origin_verify_header_value" {
  type      = string
  sensitive = true
}

variable "price_class" {
  type    = string
  default = "PriceClass_200"
}
