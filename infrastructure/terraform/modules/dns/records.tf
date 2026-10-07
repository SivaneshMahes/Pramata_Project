# Alias records are created after the distribution and ALB exist; they live in
# a separate resource set so certificates can be issued first.

resource "aws_route53_record" "app" {
  for_each = toset(["A", "AAAA"])
  zone_id  = data.aws_route53_zone.this.zone_id
  name     = var.app_domain
  type     = each.value
  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api_origin" {
  zone_id = data.aws_route53_zone.this.zone_id
  name    = var.api_origin_domain
  type    = "A"
  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
