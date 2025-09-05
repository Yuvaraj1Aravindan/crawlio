# Self-Hosted Deployment Guide for Crawler Application

## Overview
This guide covers deploying the Crawler application on a single VM with all services installed locally (no cloud managed services).

## Prerequisites
- Ubuntu 22.04 LTS VM (or similar Linux distribution)
- At least 4GB RAM, 2 CPU cores, 50GB storage
- SSH access to the VM
- Internet connection for downloading packages

## VM Specifications
- **OS**: Ubuntu 22.04 LTS or Debian 11+
- **RAM**: 4GB minimum (8GB recommended)
- **CPU**: 2 cores minimum
- **Storage**: 50GB minimum
- **Network**: Public IP with SSH access

## Installed Services
- **Docker**: Container runtime
- **Minikube**: Local Kubernetes cluster
- **PostgreSQL**: Database server
- **Redis**: Caching server
- **Nginx Ingress**: Load balancer
- **Cert-Manager**: SSL certificate management (optional)

## Quick Start Deployment

### 1. VM Setup
```bash
# SSH into your VM
ssh user@your-vm-ip

# Run the setup script
git clone https://github.com/your-repo/crawler-gcp-k8s.git
cd crawler-gcp-k8s/gcp
chmod +x vm-setup.sh
./vm-setup.sh
```

### 2. Deploy Application
```bash
# From the project directory
cd /path/to/crawler-gcp-k8s
chmod +x gcp/deploy.sh
./gcp/deploy.sh
```

### 3. Access Application
```bash
# Get Minikube IP
minikube ip

# Access the application
# Frontend: http://MINIKUBE_IP
# Backend API: http://MINIKUBE_IP/api
```

## Manual Setup Steps

### Step 1: Install Dependencies
The `vm-setup.sh` script installs all required software:
- Docker, Docker Compose
- Minikube, kubectl
- PostgreSQL, Redis
- Nginx, cert-manager
- Firewall configuration

### Step 2: Database Setup
PostgreSQL is automatically configured with:
- Database: `crawler_db`
- User: `crawlio_user`
- Password: `crawlio_password_2024`

### Step 3: Redis Setup
Redis is installed and configured to run as a systemd service.

### Step 4: Kubernetes Deployment
Minikube is started with Docker driver, and all services are deployed.

## Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
cp gcp/.env.example .env
# Edit .env with your specific values
```

Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: For authentication
- `MINIKUBE_IP`: Your Minikube cluster IP

## Networking & Security

### Firewall Rules
The setup script configures UFW with:
- SSH (22): Allow
- HTTP (80): Allow
- HTTPS (443): Allow
- PostgreSQL (5432): Allow (internal)
- Redis (6379): Allow (internal)

### Service Access
- **Frontend**: `http://VM_IP` or `http://MINIKUBE_IP`
- **Backend API**: `http://VM_IP/api` or `http://MINIKUBE_IP/api`
- **Database**: `postgresql://crawlio_user:crawlio_password_2024@localhost:5432/crawler_db`
- **Redis**: `redis://localhost:6379`

## Monitoring & Troubleshooting

### Check Service Status
```bash
# Docker services
sudo systemctl status docker

# PostgreSQL
sudo systemctl status postgresql

# Redis
sudo systemctl status redis-server

# Minikube
minikube status
```

### Kubernetes Debugging
```bash
# Check pods
kubectl get pods

# Check services
kubectl get services

# Check ingress
kubectl get ingress

# View logs
kubectl logs -f deployment/crawler-backend
kubectl logs -f deployment/crawler-frontend

# Access services directly
minikube service crawler-frontend
minikube service crawler-backend
```

### Database Troubleshooting
```bash
# Connect to PostgreSQL
sudo -u postgres psql -d crawler_db

# Check Redis
redis-cli ping
```

## Backup & Recovery

### Database Backup
```bash
# PostgreSQL backup
sudo -u postgres pg_dump crawler_db > crawler_backup.sql

# Restore
sudo -u postgres psql -d crawler_db < crawler_backup.sql
```

### Application Backup
```bash
# Backup entire application directory
tar -czf crawler-backup.tar.gz /path/to/crawler-gcp-k8s
```

## Performance Optimization

### VM Resources
- **RAM**: Increase to 8GB+ for better performance
- **CPU**: 4+ cores recommended for production
- **Storage**: SSD storage for better I/O performance

### Database Tuning
```bash
# PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf
# Adjust shared_buffers, work_mem, etc.
sudo systemctl restart postgresql
```

### Redis Optimization
```bash
# Redis configuration
sudo nano /etc/redis/redis.conf
# Adjust maxmemory, maxmemory-policy, etc.
sudo systemctl restart redis-server
```

## SSL Configuration (Optional)

### Self-Signed Certificate
```bash
# Generate certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/localhost.key \
  -out /etc/ssl/certs/localhost.crt

# Update ingress for SSL
kubectl apply -f gcp/ingress-ssl.yaml
```

### Let's Encrypt (Production)
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create cluster issuer
kubectl apply -f gcp/letsencrypt-issuer.yaml

# Update ingress with SSL
kubectl apply -f gcp/ingress-ssl.yaml
```

## Cost Comparison

### Self-Hosted vs Cloud
- **Self-Hosted**: ~$20-50/month (VM rental)
- **GCP Managed**: ~$150-200/month (GKE + Cloud SQL + Redis)
- **Savings**: 75-80% cost reduction

### Scaling Considerations
- **Vertical Scaling**: Increase VM resources
- **Horizontal Scaling**: Add more VMs with load balancer
- **Database Scaling**: PostgreSQL replication, Redis cluster

## Maintenance Tasks

### Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Docker images
docker pull crawler-backend:latest
docker pull crawler-frontend:latest

# Redeploy
./gcp/deploy.sh
```

### Log Rotation
```bash
# Configure log rotation for PostgreSQL and Redis
sudo nano /etc/logrotate.d/postgresql
sudo nano /etc/logrotate.d/redis-server
```

### Monitoring Setup
```bash
# Install monitoring tools
sudo apt install htop iotop nmon

# Check resource usage
htop
df -h
free -h
```

This self-hosted approach provides full control, cost savings, and eliminates cloud service dependencies while maintaining production-ready reliability.
