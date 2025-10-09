#!/bin/bash

# Manual Vertex AI Service Account Setup (without API enablement)
# You'll need to enable APIs manually in the console first

set -e

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No Google Cloud project is configured."
    exit 1
fi

echo "🚀 Setting up Vertex AI service account for Podslice..."
echo "📋 Project ID: $PROJECT_ID"
echo ""
echo "⚠️  IMPORTANT: Before running this script, enable these APIs in the Google Cloud Console:"
echo "   1. Vertex AI API: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=$PROJECT_ID"
echo "   2. Discovery Engine API: https://console.cloud.google.com/apis/library/discoveryengine.googleapis.com?project=$PROJECT_ID"
echo ""
read -p "Have you enabled both APIs? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please enable the APIs first, then run this script again."
    exit 0
fi

# Create service account
echo "👤 Creating service account: podslice-vertex-ai..."
if gcloud iam service-accounts describe podslice-vertex-ai@$PROJECT_ID.iam.gserviceaccount.com &>/dev/null; then
    echo "ℹ️  Service account already exists, skipping creation..."
else
    gcloud iam service-accounts create podslice-vertex-ai \
      --display-name="Podslice Vertex AI Service Account" \
      --description="Service account for Vertex AI and Google Search grounding in news episodes"
fi

# Grant roles
echo "🔑 Granting permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:podslice-vertex-ai@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:podslice-vertex-ai@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/discoveryengine.editor"

# Create key
echo "🔐 Generating service account key..."
mkdir -p ~/.gcloud-keys

KEY_FILE=~/.gcloud-keys/podslice-vertex-ai-key.json

if [ -f "$KEY_FILE" ]; then
    echo "⚠️  Key file already exists at $KEY_FILE"
    read -p "Create a new key? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gcloud iam service-accounts keys create $KEY_FILE \
          --iam-account=podslice-vertex-ai@$PROJECT_ID.iam.gserviceaccount.com
    fi
else
    gcloud iam service-accounts keys create $KEY_FILE \
      --iam-account=podslice-vertex-ai@$PROJECT_ID.iam.gserviceaccount.com
fi

chmod 600 $KEY_FILE

echo ""
echo "✅ Service account created successfully!"
echo ""
echo "📝 Running command to add credentials to .env.local..."
echo "GOOGLE_APPLICATION_CREDENTIALS=\"$KEY_FILE\"" >> .env.local
echo ""
echo "✅ Added to .env.local!"
echo ""
echo "🎉 Done! Restart your dev server to use the news feature."
echo "   Run: pnpm dev"

