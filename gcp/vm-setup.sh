#!/bin/bash

# VM Setup Script for Self-Hosted Deployment
# Installs all software locally on VM (no GCP managed services)

set -e

echo "🚀 Setting up VM for Self-Hosted Crawler Application"

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    curl \
    wget \
    git \
    docker.io \
    docker-compose \
    build-essential \
    python3-pip \
    nodejs \
    npm \
    postgresql \
    postgresql-contrib \
    redis-server \
    ufw \
    htop \
    vim \
    net-tools

# Install Kubernetes
echo "Installing kubectl..."
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Minikube
echo "Installing Minikube..."
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Install Helm
echo "Installing Helm..."
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
sudo apt update && sudo apt install -y helm

# Start and enable services
echo "Starting services..."
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Add user to docker group
sudo usermod -aG docker $USER

# Configure PostgreSQL
echo "Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE crawler_db;" || echo "Database might already exist"
sudo -u postgres psql -c "CREATE USER crawlio_user WITH PASSWORD 'crawlio_password_2024';" || echo "User might already exist"
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
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml || echo "cert-manager installation may take a moment"

# Install nginx ingress controller
echo "Installing nginx ingress controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx

# Start Minikube
echo "Starting Minikube..."
minikube start --driver=docker

echo "✅ VM setup completed!"
echo ""
echo "Services installed:"
echo "- Docker: ✅"
echo "- PostgreSQL: ✅ (Database: crawler_db, User: crawlio_user)"
echo "- Redis: ✅"
echo "- Kubernetes (Minikube): ✅"
echo "- Helm: ✅"
echo "- Nginx Ingress: ✅"
echo ""
echo "Next steps:"
echo "1. Run the deployment script: ./gcp/deploy.sh"
