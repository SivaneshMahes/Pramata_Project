resource "aws_sns_topic" "alarms" {
  name = "${var.name}-alarms"
}

resource "aws_sns_topic_subscription" "email" {
  for_each  = toset(var.alarm_emails)
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = each.value
}

# pino writes JSON with a numeric level; 50 = error, 60 = fatal.
resource "aws_cloudwatch_log_metric_filter" "app_errors" {
  name           = "${var.name}-app-errors"
  log_group_name = var.log_group_name
  pattern        = "{ $.level >= 50 }"
  metric_transformation {
    name          = "ApplicationErrors"
    namespace     = "${var.name}/api"
    value         = "1"
    default_value = "0"
  }
}

# Every booking lifecycle change is logged as `event: booking.*` — a cheap
# business-level metric for the dashboard.
resource "aws_cloudwatch_log_metric_filter" "bookings_created" {
  name           = "${var.name}-bookings-created"
  log_group_name = var.log_group_name
  pattern        = "{ $.event = \"booking.created\" }"
  metric_transformation {
    name          = "BookingsCreated"
    namespace     = "${var.name}/api"
    value         = "1"
    default_value = "0"
  }
}

locals {
  ecs_dimensions = { ClusterName = var.cluster_name, ServiceName = var.service_name }
  alb_dimensions = { LoadBalancer = var.alb_arn_suffix }
  tg_dimensions  = { LoadBalancer = var.alb_arn_suffix, TargetGroup = var.target_group_arn_suffix }

  alarms = {
    ecs-cpu-high = {
      description = "API CPU above 80% for 10 minutes"
      namespace   = "AWS/ECS", metric = "CPUUtilization", stat = "Average", threshold = 80, periods = 2, period = 300
      dimensions  = local.ecs_dimensions, comparison = "GreaterThanThreshold"
    }
    ecs-memory-high = {
      description = "API memory above 85% for 10 minutes"
      namespace   = "AWS/ECS", metric = "MemoryUtilization", stat = "Average", threshold = 85, periods = 2, period = 300
      dimensions  = local.ecs_dimensions, comparison = "GreaterThanThreshold"
    }
    running-tasks-low = {
      description = "Fewer API tasks running than the minimum (crash loop / failed deploy)"
      namespace   = "ECS/ContainerInsights", metric = "RunningTaskCount", stat = "Minimum", threshold = var.min_task_count, periods = 3, period = 60
      dimensions  = local.ecs_dimensions, comparison = "LessThanThreshold"
    }
    alb-5xx = {
      description = "Load balancer returning 5xx (no healthy targets / timeouts)"
      namespace   = "AWS/ApplicationELB", metric = "HTTPCode_ELB_5XX_Count", stat = "Sum", threshold = 10, periods = 1, period = 300
      dimensions  = local.alb_dimensions, comparison = "GreaterThanThreshold"
    }
    target-5xx = {
      description = "API returning 5xx responses"
      namespace   = "AWS/ApplicationELB", metric = "HTTPCode_Target_5XX_Count", stat = "Sum", threshold = 10, periods = 1, period = 300
      dimensions  = local.tg_dimensions, comparison = "GreaterThanThreshold"
    }
    latency-p95 = {
      description = "p95 API latency above 1.5s"
      namespace   = "AWS/ApplicationELB", metric = "TargetResponseTime", stat = "p95", threshold = 1.5, periods = 3, period = 300
      dimensions  = local.tg_dimensions, comparison = "GreaterThanThreshold"
    }
    unhealthy-hosts = {
      description = "Targets failing health checks"
      namespace   = "AWS/ApplicationELB", metric = "UnHealthyHostCount", stat = "Maximum", threshold = 0, periods = 3, period = 60
      dimensions  = local.tg_dimensions, comparison = "GreaterThanThreshold"
    }
    app-errors = {
      description = "Application error logs"
      namespace   = "${var.name}/api", metric = "ApplicationErrors", stat = "Sum", threshold = 5, periods = 1, period = 300
      dimensions  = {}, comparison = "GreaterThanThreshold"
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "this" {
  for_each            = local.alarms
  alarm_name          = "${var.name}-${each.key}"
  alarm_description   = each.value.description
  namespace           = each.value.namespace
  metric_name         = each.value.metric
  statistic           = each.value.stat == "p95" ? null : each.value.stat
  extended_statistic  = each.value.stat == "p95" ? "p95" : null
  period              = each.value.period
  evaluation_periods  = each.value.periods
  threshold           = each.value.threshold
  comparison_operator = each.value.comparison
  dimensions          = each.value.dimensions
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_dashboard" "this" {
  dashboard_name = "${var.name}-overview"
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric", x = 0, y = 0, width = 12, height = 6
        properties = {
          title = "API CPU / memory (%)", region = var.region, stat = "Average", period = 60
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.cluster_name, "ServiceName", var.service_name],
            ["AWS/ECS", "MemoryUtilization", "ClusterName", var.cluster_name, "ServiceName", var.service_name],
          ]
        }
      },
      {
        type = "metric", x = 12, y = 0, width = 12, height = 6
        properties = {
          title   = "Running tasks", region = var.region, stat = "Average", period = 60
          metrics = [["ECS/ContainerInsights", "RunningTaskCount", "ClusterName", var.cluster_name, "ServiceName", var.service_name]]
        }
      },
      {
        type = "metric", x = 0, y = 6, width = 12, height = 6
        properties = {
          title = "Requests and errors", region = var.region, stat = "Sum", period = 60
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix],
          ]
        }
      },
      {
        type = "metric", x = 12, y = 6, width = 12, height = 6
        properties = {
          title = "Latency (s)", region = var.region, period = 60
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix, { stat = "p50" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix, { stat = "p95" }],
          ]
        }
      },
      {
        type = "metric", x = 0, y = 12, width = 12, height = 6
        properties = {
          title   = "Application errors / bookings created", region = var.region, stat = "Sum", period = 300
          metrics = [["${var.name}/api", "ApplicationErrors"], ["${var.name}/api", "BookingsCreated"]]
        }
      },
      {
        type = "log", x = 12, y = 12, width = 12, height = 6
        properties = {
          title = "Recent errors", region = var.region
          query = "SOURCE '${var.log_group_name}' | fields @timestamp, msg, err.message, req.url | filter level >= 50 | sort @timestamp desc | limit 20"
          view  = "table"
        }
      },
    ]
  })
}
