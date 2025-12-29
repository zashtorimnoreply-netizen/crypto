# Disaster Recovery Guide

## Overview

This document outlines backup procedures, recovery processes, and RTO/RPO targets for the Crypto Portfolio application.

## Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| RTO (Recovery Time Objective) | < 30 minutes | Maximum acceptable downtime |
| RPO (Recovery Point Objective) | 24 hours | Maximum acceptable data loss |
| Backup Frequency | Daily | PostgreSQL full backups |
| Test Frequency | Quarterly | Disaster recovery testing |

---

## Backup Procedures

### Automated Backups (Railway)

Railway provides automatic database backups for managed PostgreSQL.

**To access backups:**
1. Go to Railway dashboard
2. Navigate to your PostgreSQL service
3. Click "Backups" tab
4. View and restore from available backups

**Backup retention:**
- Free tier: 7 daily backups
- Pro tier: 14 daily backups + weekly snapshots

### Manual Database Backup (VPS)

Create a backup script:

```bash
#!/bin/bash
# backup.sh - Daily database backup script

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
echo "Creating backup at $(date)"
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
    -h localhost \
    -U postgres \
    -d crypto_portfolio \
    -Fc \
    -f $BACKUP_DIR/backup_$DATE.dump

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/backup_$DATE.dump s3://my-backups/

# Remove old backups
find $BACKUP_DIR -name "backup_*.dump" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: backup_$DATE.dump"
```

**Schedule daily backups with cron:**
```bash
# Add to crontab
crontab -e

# Add this line (runs at 2 AM daily)
0 2 * * * /path/to/backup.sh >> /var/log/pg_backup.log 2>&1
```

### Redis Data Backup

```bash
# Backup Redis data
docker-compose exec redis redis-cli BGSAVE
sleep 5
docker-compose exec redis cat /data/dump.rdb > redis_backup_$(date +%Y%m%d).rdb

# Or use RDB copy
docker cp redis_container:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

---

## Recovery Procedures

### Option 1: Restore from Railway Backup

1. Go to Railway dashboard
2. Navigate to PostgreSQL service → "Backups"
3. Select the desired backup point
4. Click "Restore"
5. Confirm restoration (creates new database instance)
6. Update application connection string if needed

### Option 2: Restore from Manual Backup (VPS)

**PostgreSQL restore:**
```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop backend

# Drop existing database (WARNING: data loss)
docker-compose -f docker-compose.prod.yml exec postgres \
    psql -U postgres -c "DROP DATABASE crypto_portfolio;"

# Create new database
docker-compose -f docker-compose.prod.yml exec postgres \
    psql -U postgres -c "CREATE DATABASE crypto_portfolio;"

# Restore from backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
    pg_restore -U postgres -d crypto_portfolio /backups/backup_20241215_020000.dump

# Restart application
docker-compose -f docker-compose.prod.yml start backend
```

**Point-in-time recovery (if using continuous archiving):**
```bash
# Set up recovery.conf (PostgreSQL 12+ uses target settings)
# Create recovery signal file
docker-compose -f docker-compose.prod.yml exec postgres \
    bash -c "echo 'restore_command = /path/to/wal/%f' > /var/lib/postgresql/data/recovery.conf"

# Create recovery signal
docker-compose -f docker-compose.prod.yml exec postgres \
    touch /var/lib/postgresql/data/recovery.signal
```

### Option 3: Rebuild from Scratch

If all else fails:

```bash
# Full rebuild with fresh database
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend \
    npm run migrate:up
```

---

## Redis Cache Recovery

Redis data is ephemeral (prices cache), but user sessions may be stored.

**Restore session data:**
```bash
# Restore Redis from backup
docker cp redis_backup_20241215.rdb redis_container:/data/dump.rdb
docker-compose restart redis
```

**Clear all cache (safe operation):**
```bash
# Flush Redis database
docker-compose exec redis redis-cli FLUSHDB
```

---

## Failover Procedures

### Scenario 1: Backend Service Crashes

**Symptoms:**
- `/health` endpoint returns 503
- API requests fail with 502/503

**Recovery:**
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend

# Check logs
docker-compose -f docker-compose.prod.yml logs backend --tail 100
```

### Scenario 2: Database Unavailable

**Symptoms:**
- `/health` shows postgres: "disconnected"
- All API endpoints fail

**Recovery:**
```bash
# Check database status
docker-compose -f docker-compose.prod.yml logs postgres

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres

# Wait for health check
sleep 10
curl http://localhost:3000/health
```

### Scenario 3: Complete Server Failure

**Recovery (VPS):**
1. Provision new server
2. Install Docker and Docker Compose
3. Clone repository
4. Restore from backup (see Option 2 above)
5. Update DNS if server IP changed

**Recovery (Railway):**
1. Go to Railway dashboard
2. Restore from backup (see Option 1 above)
3. Update environment variables if needed
4. Deploy service

---

## Disaster Recovery Checklist

### Pre-Disaster Preparation

- [ ] All environment variables documented
- [ ] Backup scripts tested and scheduled
- [ ] SSL certificates valid (>30 days)
- [ ] DNS records documented
- [ ] Access credentials secured (password manager)
- [ ] Team members have access to deployment platforms

### During Incident

- [ ] Assess scope of failure
- [ ] Notify stakeholders
- [ ] Select recovery option
- [ ] Execute recovery steps
- [ ] Verify application health
- [ ] Test critical functionality

### Post-Recovery

- [ ] Verify data integrity
- [ ] Update monitoring thresholds
- [ ] Document incident
- [ ] Review and update procedures
- [ ] Test recovery process

---

## Rollback Procedures

### Git Rollback (if deployment introduced issue)

```bash
# View recent commits
git log --oneline -10

# Create rollback branch
git checkout -b rollback-$(date +%Y%m%d)

# Revert to previous version
git checkout <previous-commit-hash>

# Push and deploy
git push origin rollback-$(date +%Y%m%d)
# Trigger deployment pipeline
```

### Docker Image Rollback

```bash
# View available images
docker images | grep crypto

# Rollback to previous image
docker tag ghcr.io/yourrepo/backend:previous-tag \
    ghcr.io/yourrepo/backend:latest

# Restart service
docker-compose -f docker-compose.prod.yml restart backend
```

---

## Monitoring for Data Corruption

### Automated Integrity Checks

**PostgreSQL:**
```sql
-- Check for corrupted tables
SELECT * FROM pg_catalog.pg_tables WHERE schemaname = 'public';

-- Check indexes
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'your_table';
```

**Application-level:**
- Run health checks after recovery
- Verify critical data points
- Check recent transactions

### Alerting on Anomalies

Configure alerts for:
- Database connection failures
- High error rates (>5%)
- Unusual response times
- Failed backup jobs

---

## Contact Information

| Role | Contact | Responsibility |
|------|---------|----------------|
| DevOps Lead | (add email) | Infrastructure management |
| Developer On-Call | (add email) | Application issues |
| Database Admin | (add email) | Database emergencies |

---

## Testing Schedule

| Test Type | Frequency | Duration | Responsible |
|-----------|-----------|----------|-------------|
| Backup restoration | Quarterly | 1 hour | DevOps |
| Failover drill | Semi-annual | 2 hours | DevOps |
| Recovery time verification | Quarterly | 30 min | DevOps |

**Last tested:** (add date)
**Next test due:** (add date)
