output "cdn_certificate_arn" {
  value = aws_acm_certificate_validation.cdn.certificate_arn
}

output "origin_certificate_arn" {
  value = aws_acm_certificate_validation.origin.certificate_arn
}
