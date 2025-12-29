#!/bin/bash

# Script to generate .env file with required secrets
# Usage: ./scripts/generate-env.sh

set -e

ENV_FILE=".env"
DOCKER_INI="config/docker.ini"
TEMP_PRIVATE_KEY="/tmp/rsa_private_key_$$.pem"
TEMP_PUBLIC_KEY="/tmp/rsa_public_key_$$.pem"

echo "🔐 Generating .env file with secrets..."
echo ""

# Prompt for COUCHDB_URL
echo "📦 CouchDB URL Configuration"
echo "   This is the connection URL for your CouchDB database."
echo "   It should include the protocol, credentials, host, and port."
echo "   Example: http://admin:password@localhost:5984"
read -p "Enter COUCHDB_URL [http://admin:password@localhost:5984]: " COUCHDB_URL
COUCHDB_URL=${COUCHDB_URL:-"http://admin:password@localhost:5984"}

echo ""

# Prompt for BETTER_AUTH_URL
echo "🔗 Better Auth Base URL Configuration"
echo "   This is the base URL where your Better Auth API is accessible."
echo "   It's used for redirects, callbacks, and OAuth flows."
echo "   Example: http://localhost:3000"
read -p "Enter BETTER_AUTH_URL [http://localhost:3000]: " BETTER_AUTH_URL
BETTER_AUTH_URL=${BETTER_AUTH_URL:-"http://localhost:3000"}

echo ""
echo "Generating secrets..."

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
  echo ""
  echo "# CouchDB connection URL (includes protocol, credentials, host, and port)"
  echo "COUCHDB_URL=$COUCHDB_URL"
  echo ""
  echo "# Better Auth base URL (used for redirects, callbacks, and OAuth flows)"
  echo "BETTER_AUTH_URL=$BETTER_AUTH_URL"
  echo ""
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

# Update CouchDB docker.ini with the public key
if [ -f "$DOCKER_INI" ]; then
  echo ""
  echo "🔧 Updating CouchDB config with matching public key..."
  
  # Use sed to update the rsa:_default line in docker.ini
  # The public key needs to have newlines escaped as \n for the single-line config format
  if grep -q "^rsa:_default" "$DOCKER_INI"; then
    # Create a properly escaped version for sed replacement
    ESCAPED_PUBLIC_KEY=$(echo "$COUCHDB_JWT_PUBLIC_KEY" | sed 's/[&/\]/\\&/g')
    sed -i.bak "s|^rsa:_default.*|rsa:_default = $ESCAPED_PUBLIC_KEY|" "$DOCKER_INI"
    rm -f "${DOCKER_INI}.bak"
    echo "✅ Updated rsa:_default in $DOCKER_INI"
  else
    echo "⚠️  Could not find rsa:_default in $DOCKER_INI - please add it manually to [jwt_keys] section:"
    echo "    rsa:_default = $COUCHDB_JWT_PUBLIC_KEY"
  fi
  
  echo ""
  echo "⚠️  Remember to restart CouchDB for the new key to take effect:"
  echo "    docker-compose down && docker-compose up -d"
fi

echo ""
echo "📝 Generated .env file with:"
echo "  - COUCHDB_URL: $COUCHDB_URL"
echo "  - BETTER_AUTH_URL: $BETTER_AUTH_URL"
echo "  - AUTH_SECRET: ${#AUTH_SECRET} characters"
echo "  - COUCHDB_JWT_SECRET: RSA 2048-bit private key"
echo "  - COUCHDB_JWT_PUBLIC_KEY: RSA 2048-bit public key"
echo ""
echo "⚠️  Keep the .env file secure and never commit it to version control!"

