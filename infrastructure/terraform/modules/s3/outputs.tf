output "web_bucket_name" {
  value = aws_s3_bucket.this["web"].id
}

output "web_bucket_arn" {
  value = aws_s3_bucket.this["web"].arn
}

output "web_bucket_regional_domain_name" {
  value = aws_s3_bucket.this["web"].bucket_regional_domain_name
}

output "media_bucket_name" {
  value = aws_s3_bucket.this["media"].id
}

output "media_bucket_arn" {
  value = aws_s3_bucket.this["media"].arn
}

output "media_bucket_regional_domain_name" {
  value = aws_s3_bucket.this["media"].bucket_regional_domain_name
}
