terraform {
  required_providers {
    mongodbatlas = {
      source = "mongodb/mongodbatlas"
    }
    random = {
      source = "hashicorp/random"
    }
  }
}

# Optional: manages the Atlas cluster, its network access list and the
# application's database user. Atlas API keys come from the environment
# (MONGODB_ATLAS_PUBLIC_KEY / MONGODB_ATLAS_PRIVATE_KEY), never from code.

locals {
  is_shared_tier = contains(["M0", "M2", "M5"], var.instance_size)
}

resource "mongodbatlas_advanced_cluster" "this" {
  project_id     = var.project_id
  name           = var.cluster_name
  cluster_type   = "REPLICASET"
  backup_enabled = local.is_shared_tier ? false : var.backup_enabled

  replication_specs {
    region_configs {
      provider_name         = local.is_shared_tier ? "TENANT" : "AWS"
      backing_provider_name = local.is_shared_tier ? "AWS" : null
      region_name           = var.region
      priority              = 7
      electable_specs {
        instance_size = var.instance_size
        node_count    = local.is_shared_tier ? null : 3
      }
      dynamic "auto_scaling" {
        for_each = local.is_shared_tier ? [] : [1]
        content {
          compute_enabled            = true
          compute_scale_down_enabled = true
          compute_min_instance_size  = var.instance_size
          compute_max_instance_size  = var.max_instance_size
          disk_gb_enabled            = true
        }
      }
    }
  }

  advanced_configuration {
    minimum_enabled_tls_protocol = "TLS1_2"
    javascript_enabled           = false
  }

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [replication_specs[0].region_configs[0].electable_specs[0].instance_size]
  }
}

# Only the VPC's NAT egress IPs may connect — not 0.0.0.0/0.
resource "mongodbatlas_project_ip_access_list" "nat" {
  for_each   = toset(var.allowed_cidrs)
  project_id = var.project_id
  cidr_block = each.value
  comment    = "${var.cluster_name} ECS egress"
}

resource "random_password" "app_user" {
  length  = 32
  special = false
}

resource "mongodbatlas_database_user" "app" {
  project_id         = var.project_id
  username           = var.database_username
  password           = random_password.app_user.result
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = var.database_name
  }

  scopes {
    name = mongodbatlas_advanced_cluster.this.name
    type = "CLUSTER"
  }
}
