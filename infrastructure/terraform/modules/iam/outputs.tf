output "execution_role_arn" {
  value = aws_iam_role.execution.arn
}

output "task_role_arn" {
  value = aws_iam_role.task.arn
}

output "deploy_role_arn" {
  description = "Set as AWS_DEPLOY_ROLE_ARN in the GitHub environment."
  value       = aws_iam_role.deploy.arn
}
