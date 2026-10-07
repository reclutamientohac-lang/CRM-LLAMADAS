#!/usr/bin/env bash
# Run in Google Cloud Shell from the repository root after approval of IAM access.
set -euo pipefail
CRM_PROJECT='project-76706253-7b54-4622-a4a'
CRM_DATABASE='ai-studio-e3fb58d5-7744-4050-bf57-8e9490a79402'
CRM_WORKER="crm-calendar-worker@${CRM_PROJECT}.iam.gserviceaccount.com"
CRM_CALENDAR="crm-calendar-sync@${CRM_PROJECT}.iam.gserviceaccount.com"
command -v gcloud >/dev/null || { echo 'Ejecuta este archivo desde Google Cloud Shell.'; exit 1; }
[[ -f firebase.central.json ]] || { echo 'Abre la carpeta raíz del repositorio.'; exit 1; }
CRM_BILLING=$(gcloud billing projects describe "$CRM_PROJECT" --format='value(billingEnabled)')
[[ "$CRM_BILLING" == 'True' || "$CRM_BILLING" == 'true' ]] || { echo 'Se requiere facturación habilitada. No se ha contratado ni activado ningún plan.'; exit 1; }
CRM_LOCATION=$(gcloud firestore databases describe --project="$CRM_PROJECT" --database="$CRM_DATABASE" --format='value(locationId)')
case "$CRM_LOCATION" in
 nam5|nam7) CRM_REGION='us-central1' ;;
 eur3) CRM_REGION='europe-west1' ;;
 *) CRM_REGION="$CRM_LOCATION" ;;
esac
printf 'Proyecto: %s\nBase: %s\nRegión: %s\n' "$CRM_PROJECT" "$CRM_DATABASE" "$CRM_REGION"
printf 'Se crearán dos identidades sin claves privadas. El proceso accede a Firestore; la identidad de Calendar solo al calendario que se comparta con ella.\n'
read -r -p 'Escribe ACTIVAR para aprobar el despliegue y estos permisos: ' CRM_CONFIRM
[[ "$CRM_CONFIRM" == 'ACTIVAR' ]] || exit 1
gcloud services enable cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com eventarc.googleapis.com pubsub.googleapis.com cloudscheduler.googleapis.com iamcredentials.googleapis.com calendar-json.googleapis.com --project="$CRM_PROJECT"
for CRM_NAME in crm-calendar-worker crm-calendar-sync; do
 if ! gcloud iam service-accounts describe "${CRM_NAME}@${CRM_PROJECT}.iam.gserviceaccount.com" --project="$CRM_PROJECT" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$CRM_NAME" --project="$CRM_PROJECT" --display-name="$CRM_NAME"
 fi
done
# Scope Firestore permission to this CRM database, not other databases in the project.
gcloud projects add-iam-policy-binding "$CRM_PROJECT" --member="serviceAccount:$CRM_WORKER" --role='roles/datastore.user' --condition="expression=resource.name == 'projects/$CRM_PROJECT/databases/$CRM_DATABASE' || resource.name.startsWith('projects/$CRM_PROJECT/databases/$CRM_DATABASE/'),title=crm_calendar_database"
gcloud projects add-iam-policy-binding "$CRM_PROJECT" --member="serviceAccount:$CRM_WORKER" --role='roles/eventarc.eventReceiver' --condition=None
gcloud projects add-iam-policy-binding "$CRM_PROJECT" --member="serviceAccount:$CRM_WORKER" --role='roles/run.invoker' --condition="expression=resource.name == 'projects/$CRM_PROJECT/locations/$CRM_REGION/services/calendarcitachanged' || resource.name == 'projects/$CRM_PROJECT/locations/$CRM_REGION/services/calendarjobchanged',title=crm_calendar_triggers"
gcloud iam service-accounts add-iam-policy-binding "$CRM_CALENDAR" --project="$CRM_PROJECT" --member="serviceAccount:$CRM_WORKER" --role='roles/iam.serviceAccountTokenCreator'
printf 'CALENDAR_FUNCTION_REGION=%s\n' "$CRM_REGION" > "functions/.env.$CRM_PROJECT"
npm ci --prefix functions --ignore-scripts
npm install --ignore-scripts --no-audit --no-fund --package-lock=false
npx firebase deploy --project="$CRM_PROJECT" --config=firebase.central.json --only functions:calendar-central,firestore:rules
printf '\nServidor desplegado, aún sin activar. Comparte únicamente AGENDA DE CITAS con %s, permiso «Hacer cambios en eventos».\n' "$CRM_CALENDAR"
printf 'Publica la interfaz con VITE_CALENDAR_FUNCTION_REGION=%s y usa Agenda → Activar conexión central con la cuenta administradora.\n' "$CRM_REGION"
