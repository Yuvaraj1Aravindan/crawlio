#!/bin/bash

# VM Setup Script for GCP Deployment
# Run this on your GCP VM instance

set -e

echo "🚀 Setting up GCP VM for Crawler Application"

# Update system
sudo apt update && sudo apt upgrade -y

#!/bin/bash

# VM Setup Script for Self-Hosted Deployment
# Installs all software locally on VM (no GCP managed services)

set -e

echo "🚀 Setting up VM for Self-Hosted Crawler Application"

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y 
    curl 
    wget 
    git 
    docker.io 
    docker-compose 
    build-essential 
    python3-pip 
    nodejs 
    npm 
    postgresql 
    postgresql-contrib 
    redis-server 
    ufw 
    htop 
    vim 
    net-tools

# Install Kubernetes
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Install Helm
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt update && sudo apt install -y helm

# Start and enable services
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Add user to docker group
sudo usermod -aG docker $USER

# Configure PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE crawler_db;"
sudo -u postgres psql -c "CREATE USER crawlio_user WITH PASSWORD 'crawlio_password_2024';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE crawler_db TO crawlio_user;"
sudo -u postgres psql -c "ALTER USER crawlio_user CREATEDB;"

# Configure Redis
sudo sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
sudo systemctl restart redis-server

# Configure firewall
sudo ufw --force enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 5432/tcp
sudo ufw allow 6379/tcp

# Install cert-manager for SSL (optional)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install nginx ingress controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx

# Start Minikube
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
echo "1. Clone your repository: git clone https://github.com/your-repo/crawler-gcp-k8s.git"
echo "2. Navigate to the project: cd crawler-gcp-k8s"
echo "3. Run the deployment script: ./gcp/deploy.sh"

# Install gcloud CLI
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
sudo apt update && sudo apt install -y google-cloud-cli

# Install kubectl
sudo apt install -y kubectl

# Install Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com jammy main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y terraform

# Install Helm
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt update && sudo apt install -y helm

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install nginx ingress controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx

echo "✅ VM setup completed!"
echo ""
echo "Next steps:"
echo "1. Authenticate with GCP: gcloud auth login"
echo "2. Set your project: gcloud config set project YOUR_PROJECT_ID"
echo "3. Clone your repository: git clone https://github.com/your-repo/crawler-gcp-k8s.git"
echo "4. Navigate to the project: cd crawler-gcp-k8s"
echo "5. Run the deployment script: ./gcp/deploy.sh"
