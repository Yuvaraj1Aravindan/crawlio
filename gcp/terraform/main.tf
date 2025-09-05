# Terraform Configuration for GCP Infrastructure
# This creates the necessary GCP resources for the Crawler application

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "crawler-vpc"
  auto_create_subnetworks = false
}

# Subnet
resource "google_compute_subnetwork" "subnet" {
  name          = "crawler-subnet"
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
}

# GKE Cluster
resource "google_container_cluster" "crawler_cluster" {
  name     = "crawler-cluster"
  location = var.zone

  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.subnet.id

  initial_node_count = 1

  node_config {
    machine_type = "e2-medium"
    disk_size_gb = 50

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }

  # Enable workload identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
}

# Cloud SQL PostgreSQL Instance
resource "google_sql_database_instance" "postgres" {
  name             = "crawler-postgres"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-f1-micro"

    disk_autoresize = true
    disk_size       = 10
    disk_type       = "PD_SSD"

    ip_configuration {
      ipv4_enabled = true

      authorized_networks {
        name  = "crawler-subnet"
        value = google_compute_subnetwork.subnet.ip_cidr_range
      }
    }
  }
}

# Cloud SQL Database
resource "google_sql_database" "crawler_db" {
  name     = "crawler_db"
  instance = google_sql_database_instance.postgres.name
}

# Cloud SQL User
resource "google_sql_user" "crawler_user" {
  name     = "crawlio_user"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# Cloud Memorystore Redis
resource "google_redis_instance" "crawler_redis" {
  name           = "crawler-redis"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region

  redis_version = "REDIS_6_X"
}

# Static IP for Load Balancer
resource "google_compute_global_address" "crawler_ip" {
  name = "crawler-static-ip"
}

# Firewall rules
resource "google_compute_firewall" "allow_http" {
  name    = "allow-http"
  network = google_compute_network.vpc.id

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "allow-ssh"
  network = google_compute_network.vpc.id

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP Zone"
  type        = string
  default     = "us-central1-a"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Outputs
output "cluster_name" {
  value = google_container_cluster.crawler_cluster.name
}

output "cluster_endpoint" {
  value = google_container_cluster.crawler_cluster.endpoint
}

output "static_ip" {
  value = google_compute_global_address.crawler_ip.address
}

output "postgres_connection" {
  value = google_sql_database_instance.postgres.connection_name
}

output "redis_host" {
  value = google_redis_instance.crawler_redis.host
}
