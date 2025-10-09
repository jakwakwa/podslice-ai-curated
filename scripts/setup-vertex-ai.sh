#!/bin/bash

# Vertex AI Service Account Setup Script for Podslice
# This script creates a service account with permissions for Vertex AI and Google Search grounding

set -e  # Exit on error

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No Google Cloud project is configured."
    echo "Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "🚀 Setting up Vertex AI service account for Podslice..."
echo "📋 Project ID: $PROJECT_ID"
echo ""

# Enable APIs
echo "📡 Enabling required APIs..."
gcloud services enable aiplatform.googleapis.com discoveryengine.googleapis.com --quiet

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
  --role="roles/aiplatform.user" \
  --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:podslice-vertex-ai@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/discoveryengine.editor" \
  --quiet

# Create key
echo "🔐 Generating service account key..."
mkdir -p ~/.gcloud-keys

KEY_FILE=~/.gcloud-keys/podslice-vertex-ai-key.json

if [ -f "$KEY_FILE" ]; then
    echo "⚠️  Key file already exists at $KEY_FILE"
    read -p "Do you want to create a new key? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing key file..."
    else
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
echo "📝 Add this line to your .env.local file:"
echo "GOOGLE_APPLICATION_CREDENTIALS=\"$KEY_FILE\""
echo ""
echo "Or run this command to add it automatically:"
echo "echo 'GOOGLE_APPLICATION_CREDENTIALS=\"$KEY_FILE\"' >> /Users/jacobkotzee/Projects/v0-ai-curated-podcast-app/.env.local"
echo ""
echo "🔍 To verify the setup:"
echo "gcloud auth activate-service-account --key-file=$KEY_FILE"
echo "gcloud services list --enabled | grep -E '(aiplatform|discoveryengine)'"
echo ""
echo "🎉 Done! Restart your dev server to use the news feature."

