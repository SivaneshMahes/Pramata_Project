terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.26"
    }
  }

  # Partial configuration: bucket, key, region and lock table come from
  # backend.hcl (see backend.hcl.example) so no account details live in code.
  backend "s3" {}
}

locals {
  default_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = local.default_tags
  }
}

# CloudFront certificates must be issued in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags {
    tags = local.default_tags
  }
}

# Credentials from MONGODB_ATLAS_PUBLIC_KEY / MONGODB_ATLAS_PRIVATE_KEY.
provider "mongodbatlas" {}
