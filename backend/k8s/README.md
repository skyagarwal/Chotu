# Kubernetes Deployment Manifests for Mangwale AI Backend
# This directory contains all K8s resources for production deployment

# Apply in order:
# 1. kubectl apply -f namespace.yaml
# 2. kubectl apply -f configmap.yaml
# 3. kubectl apply -f secrets.yaml
# 4. kubectl apply -f pvc.yaml
# 5. kubectl apply -f deployments/
# 6. kubectl apply -f services/
# 7. kubectl apply -f hpa.yaml
# 8. kubectl apply -f ingress.yaml

# Directory structure:
# k8s/
#   ├── namespace.yaml           # Namespace for all resources
#   ├── configmap.yaml           # Non-sensitive configuration
#   ├── secrets.yaml             # Sensitive configuration (template)
#   ├── pvc.yaml                 # Persistent volume claims
#   ├── hpa.yaml                 # Horizontal Pod Autoscalers
#   ├── ingress.yaml             # Ingress rules
#   ├── deployments/
#   │   ├── backend.yaml         # NestJS backend
#   │   ├── postgres.yaml        # PostgreSQL database
#   │   ├── redis.yaml           # Redis cache
#   │   ├── opensearch.yaml      # OpenSearch cluster
#   │   └── vllm.yaml            # vLLM inference server
#   └── services/
#       ├── backend.yaml         # Backend service
#       ├── postgres.yaml        # PostgreSQL service
#       ├── redis.yaml           # Redis service
#       ├── opensearch.yaml      # OpenSearch service
#       └── vllm.yaml            # vLLM service
