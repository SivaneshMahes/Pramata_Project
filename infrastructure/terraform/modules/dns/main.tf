terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

data "aws_route53_zone" "this" {
  name         = var.hosted_zone_name
  private_zone = false
}

# CloudFront only accepts certificates from us-east-1.
resource "aws_acm_certificate" "cdn" {
  provider          = aws.us_east_1
  domain_name       = var.app_domain
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

# The ALB origin has its own hostname so CloudFront → ALB is HTTPS end to end.
resource "aws_acm_certificate" "origin" {
  domain_name       = var.api_origin_domain
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

locals {
  validation_records = {
    for option in concat(
      tolist(aws_acm_certificate.cdn.domain_validation_options),
      tolist(aws_acm_certificate.origin.domain_validation_options),
    ) : option.domain_name => option
  }
}

resource "aws_route53_record" "validation" {
  for_each        = local.validation_records
  zone_id         = data.aws_route53_zone.this.zone_id
  name            = each.value.resource_record_name
  type            = each.value.resource_record_type
  records         = [each.value.resource_record_value]
  ttl             = 300
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "cdn" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cdn.arn
  validation_record_fqdns = [aws_route53_record.validation[var.app_domain].fqdn]
}

resource "aws_acm_certificate_validation" "origin" {
  certificate_arn         = aws_acm_certificate.origin.arn
  validation_record_fqdns = [aws_route53_record.validation[var.api_origin_domain].fqdn]
}
