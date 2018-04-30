#!/usr/bin/env bash

set -e
set -u
set -o pipefail

if [ -z ${S3_BUCKET+x} ]; then
  echo "missing S3_BUCKET env for sync_config"
else
  DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
  aws s3 sync s3://$S3_BUCKET/cert $DIR/cert >/dev/null 2>&1 || echo "cert sync failed"
  aws s3 sync s3://$S3_BUCKET/config.json $DIR/config.json >/dev/null 2>&1 || echo "config sync failed"
fi
