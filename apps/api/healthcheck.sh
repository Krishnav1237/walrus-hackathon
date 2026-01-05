#!/bin/sh
# Simple health check script for Docker container

# Check if the health endpoint returns 200
if wget --no-verbose --tries=1 --spider http://localhost:3001/health 2>/dev/null; then
  exit 0
else
  exit 1
fi
