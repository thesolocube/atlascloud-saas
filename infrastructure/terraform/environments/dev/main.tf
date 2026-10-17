terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "environment" {
  type    = string
  default = "production"
}

# VPC Configuration
resource "aws_vpc" "atlascloud_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "atlascloud-vpc"
    Environment = var.environment
  }
}

# Isolated Subnet for Managed PostgreSQL with RLS
resource "aws_subnet" "database_subnet_a" {
  vpc_id            = aws_vpc.atlascloud_vpc.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name = "atlascloud-db-a"
  }
}

resource "aws_subnet" "database_subnet_b" {
  vpc_id            = aws_vpc.atlascloud_vpc.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.aws_region}b"

  tags = {
    Name = "atlascloud-db-b"
  }
}

# PostgreSQL RDS Subnet Group
resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "atlascloud-rds-subnet-group"
  subnet_ids = [aws_subnet.database_subnet_a.id, aws_subnet.database_subnet_b.id]

  tags = {
    Environment = var.environment
  }
}
