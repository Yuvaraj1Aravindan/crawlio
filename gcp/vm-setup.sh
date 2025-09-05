#!/bin/bash

# VM Setup Script for Self-Hosted Deployment
# Installs missing software locally on VM

set -e

echo "🚀 Setting up VM for Self-Hosted Crawler Application"

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages (skip if already installed)
echo "Installing required packages..."

# Check and install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt install -y docker.io docker-compose
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
else
    echo "Docker already installed"
fi

# Check and install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
else
    echo "PostgreSQL already installed"
fi

# Check and install Redis if not present
if ! command -v redis-cli &> /dev/null; then
    echo "Installing Redis..."
    sudo apt install -y redis-server
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
else
    echo "Redis already installed"
fi

# Install Kubernetes tools
if ! command -v kubectl &> /dev/null; then
    echo "Installing kubectl..."
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
else
    echo "kubectl already installed"
fi

if ! command -v minikube &> /dev/null; then
    echo "Installing Minikube..."
    curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
    sudo install minikube-linux-amd64 /usr/local/bin/minikube
else
    echo "Minikube already installed"
fi

if ! command -v helm &> /dev/null; then
    echo "Installing Helm..."
    curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
    sudo apt update && sudo apt install -y helm
else
    echo "Helm already installed"
fi

# Configure PostgreSQL
echo "Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE crawler_db;" 2>/dev/null || echo "Database crawler_db already exists"
sudo -u postgres psql -c "CREATE USER crawlio_user WITH PASSWORD 'crawlio_password_2024';" 2>/dev/null || echo "User crawlio_user already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE crawler_db TO crawlio_user;"
sudo -u postgres psql -c "ALTER USER crawlio_user CREATEDB;"

# Configure Redis
echo "Configuring Redis..."
sudo sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
sudo systemctl restart redis-server

# Configure firewall
echo "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 5432/tcp
sudo ufw allow 6379/tcp

# Install cert-manager for SSL (optional)
echo "Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml 2>/dev/null || echo "cert-manager may already be installed"

# Install nginx ingress controller
echo "Installing nginx ingress controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || echo "ingress-nginx repo may already exist"
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx 2>/dev/null || echo "nginx-ingress may already be installed"

# Start Minikube
echo "Starting Minikube..."
minikube start --driver=docker

echo "✅ VM setup completed!"
echo ""
echo "Services status:"
echo "- Docker: $(systemctl is-active docker)"
echo "- PostgreSQL: $(systemctl is-active postgresql)"
echo "- Redis: $(systemctl is-active redis-server)"
echo "- Minikube: $(minikube status | grep -o "Running" | wc -l) services running"
echo ""
echo "Database: crawler_db, User: crawlio_user"
echo ""
echo "Ready for deployment! Run: ./gcp/deploy.sh"
