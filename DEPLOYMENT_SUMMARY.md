# Crawler Application - Self-Hosted Deployment Summary

## 🎯 Deployment Strategy: Self-Hosted (No Cloud Services)

Your crawler application is now configured for **self-hosted deployment** on a single VM with all services installed locally. This approach eliminates cloud service dependencies and provides full control over your infrastructure.

## 📁 Updated Project Structure
```
/home/yuvaraj/Projects/crawler-gcp-k8s/
├── gcp/
│   ├── README.md           # Self-hosted deployment guide
│   ├── vm-setup.sh         # VM initialization script (updated)
│   ├── deploy.sh           # Local deployment script (updated)
│   ├── ingress.yaml        # Local ingress configuration (updated)
│   ├── .env.example        # Local environment variables (updated)
│   └── terraform/          # (Removed - not needed for self-hosted)
├── backend/                # FastAPI backend application
├── frontend/               # Next.js frontend application
├── k8s/                   # Local Kubernetes manifests
└── Dockerfiles            # Container build configurations
```

## 🚀 Self-Hosted Quick Start (4 Steps)

### 1. Provision VM
```bash
# Choose your cloud provider (AWS, GCP, DigitalOcean, etc.)
# Minimum specs: Ubuntu 22.04, 4GB RAM, 2 CPU, 50GB SSD
```

### 2. VM Setup
```bash
# SSH into your VM
ssh user@your-vm-ip

# Run the comprehensive setup script
git clone https://github.com/your-repo/crawler-gcp-k8s.git
cd crawler-gcp-k8s/gcp
chmod +x vm-setup.sh
./vm-setup.sh
```

### 3. Deploy Application
```bash
# Deploy to local Kubernetes
cd /path/to/crawler-gcp-k8s
chmod +x gcp/deploy.sh
./gcp/deploy.sh
```

### 4. Access Application
```bash
# Get your application URLs
minikube ip
# Frontend: http://MINIKUBE_IP
# Backend: http://MINIKUBE_IP/api
```

## 🔧 Installed Services (All Local)

### Core Services
- **Docker**: Container runtime and image management
- **Minikube**: Local Kubernetes cluster
- **PostgreSQL**: Relational database (local installation)
- **Redis**: Caching and session storage (local installation)

### Networking & Security
- **Nginx Ingress**: Local load balancer and reverse proxy
- **UFW Firewall**: Configured with proper rules
- **Cert-Manager**: SSL certificate management (optional)

### Development Tools
- **kubectl**: Kubernetes command-line tool
- **Helm**: Package manager for Kubernetes
- **Git**: Version control
- **curl/wget**: Network utilities

## 💰 Cost Comparison

| Service | Self-Hosted | Cloud Managed | Savings |
|---------|-------------|---------------|---------|
| VM | $20-50/month | $50-100/month | 50-60% |
| Database | Included | $25-50/month | 100% |
| Redis | Included | $20-30/month | 100% |
| Kubernetes | Included | $50-70/month | 100% |
| **Total** | **$20-50/month** | **$145-250/month** | **75-80%** |

## 🏗️ Architecture Overview

```
Internet → VM (Public IP)
    ↓
[UFW Firewall]
    ↓
[Nginx Ingress Controller]
    ↓
├── Frontend Service (Port 3001)
│   └── Next.js Application
└── Backend Service (Port 3003)
    ├── FastAPI Application
    ├── PostgreSQL (Port 5432)
    └── Redis (Port 6379)
```

## 🔑 Key Configurations

### Database (Local PostgreSQL)
- **Host**: localhost
- **Port**: 5432
- **Database**: crawler_db
- **User**: crawlio_user
- **Password**: crawlio_password_2024

### Redis (Local)
- **Host**: localhost
- **Port**: 6379
- **No password** (local development)

### Minikube
- **Driver**: Docker
- **Default IP**: 192.168.49.2
- **Ingress**: Nginx controller

## 📊 Resource Requirements

### Minimum Specifications
- **RAM**: 4GB
- **CPU**: 2 cores
- **Storage**: 50GB SSD
- **Network**: 1Gbps connection

### Recommended for Production
- **RAM**: 8GB
- **CPU**: 4 cores
- **Storage**: 100GB SSD
- **Network**: 1Gbps connection

## 🔄 Deployment Process

### Automated Setup
1. **VM Provisioning**: Create Ubuntu 22.04 instance
2. **Service Installation**: Run `vm-setup.sh` (installs all software)
3. **Application Deployment**: Run `deploy.sh` (builds and deploys)
4. **Service Verification**: Check all pods and services are running

### Manual Verification
```bash
# Check all services
sudo systemctl status postgresql redis-server docker
minikube status
kubectl get pods
kubectl get services
```

## 🌐 Access URLs

After successful deployment:
- **Frontend**: `http://YOUR_MINIKUBE_IP`
- **Backend API**: `http://YOUR_MINIKUBE_IP/api`
- **Health Check**: `http://YOUR_MINIKUBE_IP/api/health`

## 🔒 Security Features

### Firewall (UFW)
- SSH (22): ✅ Allowed
- HTTP (80): ✅ Allowed
- HTTPS (443): ✅ Allowed
- PostgreSQL (5432): ✅ Internal only
- Redis (6379): ✅ Internal only

### Application Security
- JWT authentication
- API key validation
- CORS configuration
- Input validation
- SQL injection protection

## 📈 Monitoring & Maintenance

### Built-in Monitoring
```bash
# System monitoring
htop
df -h
free -h

# Application logs
kubectl logs -f deployment/crawler-backend
kubectl logs -f deployment/crawler-frontend

# Database monitoring
sudo -u postgres psql -d crawler_db -c "SELECT * FROM pg_stat_activity;"
```

### Backup Strategy
```bash
# Database backup
sudo -u postgres pg_dump crawler_db > backup_$(date +%Y%m%d).sql

# Application backup
tar -czf app_backup_$(date +%Y%m%d).tar.gz /path/to/crawler-gcp-k8s
```

## 🚀 Scaling Options

### Vertical Scaling
- Increase VM RAM/CPU
- Optimize PostgreSQL settings
- Configure Redis memory limits

### Horizontal Scaling (Future)
- Add load balancer
- Database replication
- Redis clustering
- Multiple application instances

## 🔧 Troubleshooting Guide

### Common Issues
1. **Minikube not starting**: Check Docker service
2. **Pods not ready**: Check resource limits
3. **Database connection failed**: Verify PostgreSQL service
4. **Redis connection failed**: Check Redis service status

### Quick Fixes
```bash
# Restart services
sudo systemctl restart postgresql redis-server docker
minikube stop && minikube start

# Clean redeploy
kubectl delete -f k8s/
./gcp/deploy.sh
```

## ✅ What's Been Accomplished

1. **Self-Hosted Configuration**: Complete shift from cloud services to local installation
2. **Automated Setup**: Single script installs all required software
3. **Local Kubernetes**: Minikube deployment with Docker driver
4. **Database Integration**: Local PostgreSQL with proper user/database setup
5. **Caching Layer**: Local Redis installation and configuration
6. **Security**: UFW firewall with proper rules
7. **Networking**: Nginx ingress for service routing
8. **Documentation**: Comprehensive self-hosted deployment guide

## 🎯 Next Steps

1. **Provision VM**: Choose cloud provider and create instance
2. **Run Setup**: Execute `vm-setup.sh` for complete installation
3. **Deploy Application**: Run `deploy.sh` for container deployment
4. **Test Access**: Verify frontend and API functionality
5. **Configure Backups**: Set up automated backup scripts
6. **Monitor Performance**: Use built-in monitoring tools

Your crawler application is now fully prepared for **self-hosted deployment** with significant cost savings and complete infrastructure control! 🎉

## 🚀 Quick Start (3 Steps)

### 1. GCP Project Setup
```bash
# Create GCP project and enable APIs
gcloud projects create your-crawler-project
gcloud config set project your-crawler-project

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable compute.googleapis.com
```

### 2. VM Provisioning
```bash
# Create VM instance
gcloud compute instances create crawler-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-ssd

# SSH into VM
gcloud compute ssh crawler-vm --zone=us-central1-a
```

### 3. Deploy Application
```bash
# On the VM, run setup and deployment
git clone https://github.com/your-repo/crawler-gcp-k8s.git
cd crawler-gcp-k8s/gcp
chmod +x vm-setup.sh deploy.sh
./vm-setup.sh
./deploy.sh
```

## 🔑 Required Credentials

### Service Account Key
- **File**: `gcp/service-account-key.json`
- **Permissions Required**:
  - Compute Engine Admin
  - Kubernetes Engine Admin
  - Cloud SQL Admin
  - Storage Admin

### SSH Keys
- **Private Key**: `~/.ssh/gcp-vm-key`
- **Public Key**: `~/.ssh/gcp-vm-key.pub`
- **Generate**: `ssh-keygen -t rsa -b 2048 -f ~/.ssh/gcp-vm-key`

### Database Credentials
- **Database Name**: `crawler_db`
- **Username**: `crawlio_user`
- **Password**: Store in GCP Secret Manager

## 🏗️ Infrastructure Components

### Compute
- **GKE Cluster**: 3 nodes, e2-medium instances
- **VM Instance**: Ubuntu 22.04, e2-medium for deployment

### Storage
- **Cloud SQL**: PostgreSQL 15, 1 vCPU, 3.75GB RAM
- **Cloud Memorystore**: Redis 6.x, 1GB memory
- **Cloud Storage**: For backups and static assets

### Networking
- **Load Balancer**: Global HTTP(S) load balancer
- **Ingress**: Nginx ingress controller
- **SSL**: Let's Encrypt certificates via cert-manager

## 📊 Cost Estimate (Monthly)
- **GKE Cluster**: ~$70 (3 nodes × $23.50)
- **Cloud SQL**: ~$25 (db-f1-micro)
- **Cloud Memorystore**: ~$20 (1GB Redis)
- **VM Instance**: ~$25 (e2-medium, always-on)
- **Load Balancer**: ~$20
- **Storage**: ~$5
- **Total**: ~$165/month

## 🔧 Configuration Files Created

### Infrastructure as Code
- `gcp/terraform/main.tf`: Complete GCP infrastructure setup
- Creates GKE cluster, Cloud SQL, Redis, VPC, firewall rules

### Deployment Automation
- `gcp/deploy.sh`: Automated deployment script
- Builds Docker images, pushes to GCR, deploys to Kubernetes

### Kubernetes Manifests
- `gcp/ingress.yaml`: Load balancer and SSL configuration
- Application deployments, services, and configmaps

### Environment Template
- `gcp/.env.example`: All required environment variables
- Database connections, Redis settings, API endpoints

## ✅ What's Been Done

1. **Application Code**: Updated for GCP deployment
2. **Docker Images**: Configured for GCR and multi-stage builds
3. **Kubernetes Manifests**: Production-ready deployments
4. **Infrastructure Code**: Terraform for complete GCP setup
5. **Deployment Scripts**: Automated CI/CD pipeline
6. **Security**: Service accounts, network policies, SSL
7. **Monitoring**: Health checks, logging, resource monitoring

## 🎯 Next Steps

1. **Create GCP Project** and enable billing
2. **Generate Service Account** with required permissions
3. **Create SSH Keys** for VM access
4. **Provision VM** and run setup script
5. **Execute Terraform** to create infrastructure
6. **Run Deployment Script** to launch application
7. **Configure Domain** (optional) for custom URL
8. **Test Application** functionality

## 📞 Support

If you encounter any issues:
1. Check the `gcp/README.md` for detailed troubleshooting
2. Verify all credentials are properly configured
3. Ensure GCP project has sufficient quota and billing
4. Check Kubernetes pod logs: `kubectl logs -f deployment/crawler-backend`

## 🔒 Security Notes

- Service account keys are sensitive - store securely
- SSH keys should be protected with strong passphrases
- Database passwords stored in GCP Secret Manager
- Network policies restrict pod-to-pod communication
- SSL certificates automatically renewed by cert-manager

Your application is now ready for production deployment on GCP! 🚀
