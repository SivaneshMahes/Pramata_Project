variable "hosted_zone_name" {
  description = "Existing public Route 53 hosted zone, e.g. example.com."
  type        = string
}

variable "app_domain" {
  description = "Public app hostname served by CloudFront."
  type        = string
}

variable "api_origin_domain" {
  description = "Hostname for the ALB origin (only CloudFront uses it)."
  type        = string
}

variable "cloudfront_domain_name" {
  type = string
}

variable "cloudfront_hosted_zone_id" {
  type = string
}

variable "alb_dns_name" {
  type = string
}

variable "alb_zone_id" {
  type = string
}
