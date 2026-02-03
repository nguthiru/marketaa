#!/bin/bash

# Cron Job Setup Script for VPS Deployment (Coolify compatible)
# Run this after deploying to set up scheduled job processing

set -e

# Configuration - checks common Coolify env var names
# Coolify typically provides COOLIFY_URL, COOLIFY_FQDN, or you may have set NEXT_PUBLIC_APP_URL
APP_URL="${APP_URL:-${COOLIFY_URL:-${COOLIFY_FQDN:-${NEXT_PUBLIC_APP_URL:-${NEXTAUTH_URL:-}}}}}"
CRON_SECRET="${CRON_SECRET:-${CRON_JOB_SECRET:-}}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  Marketaa Cron Job Setup"
echo "=========================================="

# Check if required variables are set
if [ -z "$APP_URL" ]; then
    echo -e "${YELLOW}Warning: APP_URL not found.${NC}"
    echo "Checked: APP_URL, COOLIFY_URL, COOLIFY_FQDN, NEXT_PUBLIC_APP_URL, NEXTAUTH_URL"
    read -p "Enter your application URL (e.g., https://app.example.com): " APP_URL
else
    echo -e "${GREEN}Found APP_URL: ${APP_URL}${NC}"
fi

if [ -z "$CRON_SECRET" ]; then
    echo -e "${YELLOW}Warning: CRON_SECRET not found.${NC}"
    echo "Checked: CRON_SECRET, CRON_JOB_SECRET"
    read -p "Enter your CRON_SECRET (leave empty to skip auth): " CRON_SECRET
else
    echo -e "${GREEN}Found CRON_SECRET${NC}"
fi

# Build the cron command
if [ -n "$CRON_SECRET" ]; then
    CRON_CMD="curl -sS -X POST ${APP_URL}/api/cron/process-jobs -H \"Authorization: Bearer ${CRON_SECRET}\" >> /var/log/marketaa-cron.log 2>&1"
else
    CRON_CMD="curl -sS -X POST ${APP_URL}/api/cron/process-jobs >> /var/log/marketaa-cron.log 2>&1"
fi

CRON_JOB="*/5 * * * * ${CRON_CMD}"

echo ""
echo "Cron job to be added:"
echo -e "${GREEN}${CRON_JOB}${NC}"
echo ""

# Check if cron job already exists
EXISTING_CRON=$(crontab -l 2>/dev/null | grep -F "/api/cron/process-jobs" || true)

if [ -n "$EXISTING_CRON" ]; then
    echo -e "${YELLOW}Existing cron job found:${NC}"
    echo "$EXISTING_CRON"
    read -p "Replace existing cron job? (y/n): " REPLACE
    if [ "$REPLACE" != "y" ]; then
        echo "Aborting."
        exit 0
    fi
    # Remove existing cron job
    crontab -l 2>/dev/null | grep -vF "/api/cron/process-jobs" | crontab -
fi

# Add the cron job
(crontab -l 2>/dev/null || true; echo "$CRON_JOB") | crontab -

echo ""
echo -e "${GREEN}Cron job installed successfully!${NC}"
echo ""

# Create log file if it doesn't exist
sudo touch /var/log/marketaa-cron.log 2>/dev/null || touch /var/log/marketaa-cron.log 2>/dev/null || true
sudo chmod 666 /var/log/marketaa-cron.log 2>/dev/null || chmod 666 /var/log/marketaa-cron.log 2>/dev/null || true

echo "Log file: /var/log/marketaa-cron.log"
echo ""

# Test the endpoint
echo "Testing the cron endpoint..."
if [ -n "$CRON_SECRET" ]; then
    RESPONSE=$(curl -sS -w "\n%{http_code}" -X POST "${APP_URL}/api/cron/process-jobs" -H "Authorization: Bearer ${CRON_SECRET}" 2>&1)
else
    RESPONSE=$(curl -sS -w "\n%{http_code}" -X POST "${APP_URL}/api/cron/process-jobs" 2>&1)
fi

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}Endpoint test successful (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}Endpoint test failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    echo ""
    echo "Please check:"
    echo "  1. Your APP_URL is correct"
    echo "  2. Your CRON_SECRET matches the one in .env"
    echo "  3. Your application is running"
fi

echo ""
echo "=========================================="
echo "  Setup Complete"
echo "=========================================="
echo ""
echo "Useful commands:"
echo "  View cron jobs:    crontab -l"
echo "  Edit cron jobs:    crontab -e"
echo "  View logs:         tail -f /var/log/marketaa-cron.log"
echo ""
