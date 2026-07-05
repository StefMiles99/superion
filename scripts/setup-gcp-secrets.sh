# Script auxiliar — crea secrets en GCP Secret Manager para Cloud Run.
# Uso: ./scripts/setup-gcp-secrets.sh [GCP_PROJECT_ID]
# Requiere backend/.env.cloudrun con valores reales.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/backend/.env.cloudrun"
PROJECT_ID="${1:-${GCP_PROJECT_ID:-}}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Uso: $0 <project-id>"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: falta ${ENV_FILE}"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud services enable secretmanager.googleapis.com --quiet

create_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "${value}" ]]; then
    echo "SKIP ${name} (vacío)"
    return
  fi
  if gcloud secrets describe "${name}" >/dev/null 2>&1; then
    printf '%s' "${value}" | gcloud secrets versions add "${name}" --data-file=-
  else
    printf '%s' "${value}" | gcloud secrets create "${name}" --data-file=-
  fi
  echo "OK ${name}"
}

create_secret DATABASE_URL "${DATABASE_URL}"
create_secret SUPABASE_URL "${SUPABASE_URL}"
create_secret SUPABASE_SERVICE_ROLE_KEY "${SUPABASE_SERVICE_ROLE_KEY}"
create_secret OPENROUTER_API_KEY "${OPENROUTER_API_KEY}"
create_secret ELEVENLABS_API_KEY "${ELEVENLABS_API_KEY}"
create_secret ELEVENLABS_WEBHOOK_SECRET "${ELEVENLABS_WEBHOOK_SECRET}"
create_secret ELEVENLABS_AGENT_ID "${ELEVENLABS_AGENT_ID}"
create_secret JWT_SECRET "${JWT_SECRET}"
create_secret REDIS_URL "${REDIS_URL}"

echo ""
echo "Secrets creados. Concede acceso al service account de Cloud Run:"
echo "  gcloud secrets add-iam-policy-binding DATABASE_URL \\"
echo "    --member=serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com \\"
echo "    --role=roles/secretmanager.secretAccessor"
