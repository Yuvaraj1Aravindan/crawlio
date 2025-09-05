#!/bin/bash

# Self-Hosted Deployment Script for Crawler Application
# Run this script from the crawler-gcp-k8s directory

set -e

echo "🚀 Starting Self-Hosted Deployment for Crawler Application"

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please run the VM setup script first."
    exit 1
fi

if ! command -v minikube &> /dev/null; then
    echo "❌ Minikube is not installed. Please run the VM setup script first."
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please run the VM setup script first."
    exit 1
fi

# Check if Minikube is running
if ! minikube status | grep -q "Running"; then
    echo "🔄 Starting Minikube..."
    minikube start --driver=docker
fi

echo "✅ Prerequisites check passed"

# Build Docker images locally
echo "📦 Building Docker images locally..."

# Backend image
echo "Building backend image..."
docker build -f Dockerfile.backend -t crawler-backend:latest .

# Frontend image
echo "Building frontend image..."
cd frontend
docker build -f ../Dockerfile.frontend -t crawler-frontend:latest .
cd ..

echo "✅ Docker images built"

# Load images into Minikube
echo "🔄 Loading images into Minikube..."
minikube image load crawler-backend:latest
minikube image load crawler-frontend:latest

echo "✅ Images loaded into Minikube"

# Update Kubernetes manifests for local deployment
echo "🔧 Updating Kubernetes manifests..."

# Update backend deployment with local image
sed -i 's|gcr.io/.*crawler-backend:latest|crawler-backend:latest|g' k8s/backend.yaml

# Update frontend deployment with local image
sed -i 's|gcr.io/.*crawler-frontend:latest|crawler-frontend:latest|g' k8s/frontend.yaml

echo "✅ Manifests updated"

# Deploy to Kubernetes
echo "🚀 Deploying to Minikube..."

# Apply configurations
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/db-init.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml

# Apply local ingress configuration
kubectl apply -f gcp/ingress.yaml

echo "✅ Deployment completed!"

# Wait for pods to be ready
echo "⏳ Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod --selector=app=crawler-backend --timeout=300s
kubectl wait --for=condition=ready pod --selector=app=crawler-frontend --timeout=300s

# Get service information
echo "📊 Service Information:"
echo ""
echo "Frontend Service:"
kubectl get svc crawler-frontend
echo ""
echo "Backend Service:"
kubectl get svc crawler-backend
echo ""
echo "Ingress:"
kubectl get ingress crawler-ingress
echo ""
echo "Pod Status:"
kubectl get pods
echo ""

# Get Minikube IP for access
MINIKUBE_IP=$(minikube ip)
echo "🌐 Minikube IP: $MINIKUBE_IP"
echo ""
echo "🎉 Deployment successful!"
echo ""
echo "Access your application at:"
echo "Frontend: http://$MINIKUBE_IP"
echo "Backend API: http://$MINIKUBE_IP/api"
echo ""
echo "To access services directly:"
echo "minikube service crawler-frontend"
echo "minikube service crawler-backend"
echo ""
echo "To check logs:"
echo "kubectl logs -f deployment/crawler-backend"
echo "kubectl logs -f deployment/crawler-frontend"
