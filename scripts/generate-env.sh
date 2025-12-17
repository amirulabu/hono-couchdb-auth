#!/bin/bash

# Script to generate .env file with required secrets
# Usage: ./scripts/generate-env.sh

set -e

ENV_FILE=".env"
TEMP_PRIVATE_KEY="/tmp/rsa_private_key_$$.pem"
TEMP_PUBLIC_KEY="/tmp/rsa_public_key_$$.pem"

echo "🔐 Generating .env file with secrets..."

# Generate AUTH_SECRET - 32+ character secure random string
echo "Generating AUTH_SECRET..."
AUTH_SECRET=$(openssl rand -base64 48)

# Generate COUCHDB_JWT_SECRET - RSA private key
echo "Generating COUCHDB_JWT_SECRET (RSA private key)..."
openssl genrsa -out "$TEMP_PRIVATE_KEY" 2048 2>/dev/null

# Generate public key from private key
echo "Extracting public key..."
openssl rsa -in "$TEMP_PRIVATE_KEY" -pubout -out "$TEMP_PUBLIC_KEY" 2>/dev/null

# Read the RSA keys and format them for .env (replace newlines with literal \n)
COUCHDB_JWT_SECRET=$(awk '{if (NR>1) printf "\\n"; printf "%s", $0}' "$TEMP_PRIVATE_KEY")
COUCHDB_JWT_PUBLIC_KEY=$(awk '{if (NR>1) printf "\\n"; printf "%s", $0}' "$TEMP_PUBLIC_KEY")

# Clean up temporary key files
rm "$TEMP_PRIVATE_KEY" "$TEMP_PUBLIC_KEY"

# Create .env file using printf to preserve literal \n
{
  echo "# Generated on $(date)"
  echo "# Auth secret for session management (min 32 characters)"
  echo "AUTH_SECRET=$AUTH_SECRET"
  echo ""
  echo "# CouchDB JWT secret - RSA private key"
  printf 'COUCHDB_JWT_SECRET="%s"\n' "$COUCHDB_JWT_SECRET"
  echo ""
  echo "# CouchDB JWT public key - RSA public key (for verification)"
  printf 'COUCHDB_JWT_PUBLIC_KEY="%s"\n' "$COUCHDB_JWT_PUBLIC_KEY"
} > "$ENV_FILE"

echo "✅ .env file created successfully!"
echo ""
echo "📝 Generated secrets:"
echo "  - AUTH_SECRET: ${#AUTH_SECRET} characters"
echo "  - COUCHDB_JWT_SECRET: RSA 2048-bit private key"
echo "  - COUCHDB_JWT_PUBLIC_KEY: RSA 2048-bit public key"
echo ""
echo "⚠️  Keep this file secure and never commit it to version control!"

