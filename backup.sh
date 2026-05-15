#!/bin/bash
DATE=$(date +%Y-%m-%d)
mkdir -p /opt/dclic/backups
mongodump --quiet --db=dclic_production --out=/opt/dclic/backups/$DATE
find /opt/dclic/backups/* -maxdepth 0 -type d -mtime +30 -exec rm -rf {} \;
