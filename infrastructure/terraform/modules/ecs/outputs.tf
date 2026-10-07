output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "service_name" {
  value = aws_ecs_service.api.name
}

output "task_security_group_id" {
  value = aws_security_group.tasks.id
}

output "task_definition_family" {
  value = aws_ecs_task_definition.api.family
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.api.name
}

output "service_arn" {
  value = aws_ecs_service.api.id
}
