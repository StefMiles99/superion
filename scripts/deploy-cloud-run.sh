#!/usr/bin/env bash
# Despliega SUPERION backend + frontend (mobile/desktop) en Cloud Run — modo producción.
# Uso: ./scripts/deploy-cloud-run.sh [GCP_PROJECT_ID] [REGION]
#
# Configura variables en backend/.env.cloudrun (ver .env.cloudrun.example).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:${PATH}"

PROJECT_ID="${1:-${GCP_PROJECT_ID:-}}"
REGION="${2:-${GCP_REGION:-us-central1}}"
ENV_FILE="${ROOT}/backend/.env.cloudrun"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: falta GCP project ID."
  echo "Uso: $0 <project-id> [region]"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: falta ${ENV_FILE}"
  echo "Copia backend/.env.cloudrun.example → backend/.env.cloudrun y completa valores."
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q .; then
  echo "ERROR: no hay cuenta activa. Ejecuta: gcloud auth login"
  exit 1
fi

gcloud config set project "${PROJECT_ID}" >/dev/null

echo "==> Habilitando APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project="${PROJECT_ID}" \
  --quiet

REPO="superion"
if ! gcloud artifacts repositories describe "${REPO}" \
  --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="SUPERION container images"
fi

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"

build_image() {
  local dockerfile="$1"
  local tag="$2"
  shift 2
  local -a build_args=("$@")

  local config
  config="$(mktemp /tmp/superion-cloudbuild-XXXXXX)"
  config="${config}.yaml"
  trap 'rm -f "${config}"' RETURN

  {
    echo "steps:"
    echo "- name: gcr.io/cloud-builders/docker"
    echo "  args:"
    echo "    - build"
    echo "    - -f"
    echo "    - ${dockerfile}"
    echo "    - -t"
    echo "    - ${tag}"
    if ((${#build_args[@]} > 0)); then
      printf '%s\n' "${build_args[@]}" | sed 's/^/    - /'
    fi
    echo "    - ."
    echo "images:"
    echo "- ${tag}"
  } >"${config}"

  gcloud builds submit "${ROOT}" \
    --project="${PROJECT_ID}" \
    --config="${config}" \
    --quiet
}

backend_env_vars() {
  local api_base="${1}"
  local include_secrets="${2:-true}"
  cat <<EOF
APP_ENV=prod
CLOCK_MODE=real
PERSISTENCE=${PERSISTENCE}
AUTH=${AUTH}
STORAGE=${STORAGE}
AUDIT_LOG=${AUDIT_LOG}
EMBEDDING=${EMBEDDING}
RERANKER=${RERANKER}
PHOTO_VALIDATOR=${PHOTO_VALIDATOR}
INTENT_CLASSIFIER=${INTENT_CLASSIFIER}
PDF=${PDF}
PDF_EXTRACTOR=${PDF_EXTRACTOR}
VOICE=${VOICE}
ELEVENLABS_PROVISIONER=${ELEVENLABS_PROVISIONER}
ELEVENLABS_CONNECT_MODE=${ELEVENLABS_CONNECT_MODE}
DEPLOY_ENV=${DEPLOY_ENV:-prod}
LANGGRAPH=${LANGGRAPH}
EVENTBUS=${EVENTBUS}
DB_AUTO_MIGRATE=${DB_AUTO_MIGRATE:-true}
DB_AUTO_SEED=${DB_AUTO_SEED:-true}
DB_RESET_ON_STARTUP=${DB_RESET_ON_STARTUP:-false}
EMBEDDING_DIM=${EMBEDDING_DIM:-1536}
SUPABASE_STORAGE_BUCKET=${SUPABASE_STORAGE_BUCKET:-superion}
RATE_LIMIT_ENABLED=${RATE_LIMIT_ENABLED:-false}
API_BASE_URL=${api_base}
LANGGRAPH_URL=${api_base}
OPENROUTER_LLM_MODEL=${OPENROUTER_LLM_MODEL}
OPENROUTER_EMBEDDING_MODEL=${OPENROUTER_EMBEDDING_MODEL}
OPENROUTER_VLM_MODEL=${OPENROUTER_VLM_MODEL}
OPENROUTER_RERANKER_MODEL=${OPENROUTER_RERANKER_MODEL}
EOF
  if [[ "${include_secrets}" == "true" ]]; then
    cat <<EOF
DATABASE_URL=${DATABASE_URL}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
ELEVENLABS_WEBHOOK_SECRET=${ELEVENLABS_WEBHOOK_SECRET}
ELEVENLABS_AGENT_ID=${ELEVENLABS_AGENT_ID}
JWT_SECRET=${JWT_SECRET}
REDIS_URL=${REDIS_URL}
EOF
  fi
}

write_backend_env_file() {
  local api_base="${1}"
  local out="${2}"
  local include_secrets="${3:-true}"
  : >"${out}"
  while IFS='=' read -r key value; do
    [[ -z "${key}" ]] && continue
    value="${value//\"/\\\"}"
    printf '%s: "%s"\n' "${key}" "${value}" >>"${out}"
  done < <(backend_env_vars "${api_base}" "${include_secrets}")
}

backend_secrets() {
  cat <<EOF
DATABASE_URL=DATABASE_URL:latest
SUPABASE_URL=SUPABASE_URL:latest
SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest
OPENROUTER_API_KEY=OPENROUTER_API_KEY:latest
ELEVENLABS_API_KEY=ELEVENLABS_API_KEY:latest
ELEVENLABS_WEBHOOK_SECRET=ELEVENLABS_WEBHOOK_SECRET:latest
ELEVENLABS_AGENT_ID=ELEVENLABS_AGENT_ID:latest
JWT_SECRET=JWT_SECRET:latest
REDIS_URL=REDIS_URL:latest
EOF
}

echo "==> Build + push backend..."
build_image "backend/Dockerfile" "${REGISTRY}/backend:latest"

echo "==> Deploy backend..."
BACKEND_ENV_FILE="$(mktemp /tmp/superion-backend-env-XXXXXX).yaml"
USE_SECRETS=false
if gcloud secrets describe DATABASE_URL --project="${PROJECT_ID}" >/dev/null 2>&1; then
  USE_SECRETS=true
  write_backend_env_file "https://placeholder.run.app" "${BACKEND_ENV_FILE}" false
else
  write_backend_env_file "https://placeholder.run.app" "${BACKEND_ENV_FILE}" true
fi
trap 'rm -f "${BACKEND_ENV_FILE}"' EXIT

if [[ "${USE_SECRETS}" == "true" ]]; then
  gcloud run deploy superion-backend \
    --image="${REGISTRY}/backend:latest" \
    --region="${REGION}" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --memory=1Gi \
    --cpu=1 \
    --min-instances=1 \
    --max-instances=3 \
    --timeout=3600 \
    --session-affinity \
    --cpu-boost \
    --env-vars-file="${BACKEND_ENV_FILE}" \
    --set-secrets="$(backend_secrets | tr '\n' ',' | sed 's/,$//')" \
    --project="${PROJECT_ID}" \
    --quiet
else
  gcloud run deploy superion-backend \
    --image="${REGISTRY}/backend:latest" \
    --region="${REGION}" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --memory=1Gi \
    --cpu=1 \
    --min-instances=1 \
    --max-instances=3 \
    --timeout=3600 \
    --session-affinity \
    --cpu-boost \
    --env-vars-file="${BACKEND_ENV_FILE}" \
    --project="${PROJECT_ID}" \
    --quiet
fi

BACKEND_URL="$(gcloud run services describe superion-backend \
  --region="${REGION}" --project="${PROJECT_ID}" \
  --format='value(status.url)')"

echo "==> Actualizando API_BASE_URL y LANGGRAPH_URL..."
gcloud run services update superion-backend \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --update-env-vars="API_BASE_URL=${BACKEND_URL},LANGGRAPH_URL=${BACKEND_URL}" \
  --quiet

WS_URL="${BACKEND_URL/https:\/\//wss://}"

echo "==> Build + push mobile..."
build_image "frontend/Dockerfile.mobile" "${REGISTRY}/mobile:latest" \
  "--build-arg" "VITE_API_BASE_URL=${BACKEND_URL}" \
  "--build-arg" "VITE_WS_BASE_URL=${WS_URL}" \
  "--build-arg" "VITE_API_MODE=http" \
  "--build-arg" "VITE_WS_MODE=real" \
  "--build-arg" "VITE_VOICE_MODE=elevenlabs"

echo "==> Deploy mobile..."
gcloud run deploy superion-mobile \
  --image="${REGISTRY}/mobile:latest" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=2 \
  --project="${PROJECT_ID}" \
  --quiet

echo "==> Build + push desktop..."
build_image "frontend/Dockerfile.desktop" "${REGISTRY}/desktop:latest" \
  "--build-arg" "VITE_API_BASE_URL=${BACKEND_URL}" \
  "--build-arg" "VITE_WS_BASE_URL=${WS_URL}" \
  "--build-arg" "VITE_API_MODE=http" \
  "--build-arg" "VITE_WS_MODE=real"

echo "==> Deploy desktop..."
gcloud run deploy superion-desktop \
  --image="${REGISTRY}/desktop:latest" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=2 \
  --project="${PROJECT_ID}" \
  --quiet

MOBILE_URL="$(gcloud run services describe superion-mobile \
  --region="${REGION}" --project="${PROJECT_ID}" \
  --format='value(status.url)')"
DESKTOP_URL="$(gcloud run services describe superion-desktop \
  --region="${REGION}" --project="${PROJECT_ID}" \
  --format='value(status.url)')"

CORS="${MOBILE_URL},${DESKTOP_URL}"
if gcloud secrets describe DATABASE_URL --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud run services update superion-backend \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --update-env-vars="API_BASE_URL=${BACKEND_URL},LANGGRAPH_URL=${BACKEND_URL},CORS_ORIGINS=${CORS}" \
    --quiet
else
  gcloud run services update superion-backend \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --update-env-vars="CORS_ORIGINS=${CORS},LANGGRAPH_URL=${BACKEND_URL}" \
    --quiet
fi

cat <<EOF

========================================
SUPERION desplegado (modo producción)
========================================
Backend:  ${BACKEND_URL}
Mobile:   ${MOBILE_URL}
Desktop:  ${DESKTOP_URL}

Post-deploy:
  1. curl ${BACKEND_URL}/ready
  2. Re-deploy agente ElevenLabs:
     API_BASE_URL=${BACKEND_URL} python -m interface.cli.elevenlabs deploy
  3. Seed Supabase (si no hecho):
     DATABASE_URL=... python -m interface.cli.seed

Webhooks ElevenLabs:
  ${BACKEND_URL}/v1/elevenlabs/webhooks/conversation
EOF
