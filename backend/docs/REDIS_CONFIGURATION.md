# Redis Configuration - Mangwale.AI

## Overview

Mangwale.AI uses **two separate Redis instances** for isolation and scalability:

| Instance | Port | Purpose | Database |
|----------|------|---------|----------|
| **Mangwale Redis** | 6381 (→6379 internal) | Sessions, Analytics, Cache | DB 1 |
| **Search Redis** | 6379 | Search indexing, Caching | DB 0 |

## Mangwale Redis (Port 6381)

### Key Patterns

| Pattern | Purpose | TTL |
|---------|---------|-----|
| `session:*` | User conversation sessions | 24 hours |
| `analytics:latency:*` | Response time metrics | 7 days |
| `analytics:intent:*` | Intent accuracy tracking | 7 days |
| `analytics:funnel:*` | Conversion funnel data | 7 days |
| `cache:llm:*` | LLM response cache | 1 hour |
| `cache:nlu:*` | NLU classification cache | 1 hour |

### Configuration

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6381  # Maps to container's 6379
REDIS_PASSWORD=
REDIS_DB=1       # Use DB 1 to avoid conflicts
```

### Docker Compose

```yaml
mangwale_redis:
  image: redis:7-alpine
  ports:
    - "6381:6379"  # Host 6381 → Container 6379
  command: redis-server --appendonly yes
```

## Search Redis (Port 6379)

### Purpose

- OpenSearch query caching
- Session store for search frontend
- CDC consumer state

### Configuration

Managed by the Search stack in `/home/ubuntu/Devs/Search/`

## Why Two Instances?

1. **Isolation**: Search operations don't affect chat sessions
2. **Scalability**: Can scale independently
3. **Failover**: One failing doesn't affect the other
4. **Separate Deployment**: Search stack runs independently

## Consolidation Option

If you want to consolidate to a single Redis:

```bash
# Use different databases
MANGWALE_REDIS_DB=1
SEARCH_REDIS_DB=2

# Or use key prefixes
# mangwale:session:*
# search:cache:*
```

## Health Checks

```bash
# Mangwale Redis
redis-cli -p 6381 PING

# Search Redis
redis-cli -p 6379 PING
```

## Monitoring

```bash
# Check memory usage
redis-cli -p 6381 INFO memory

# Check key counts
redis-cli -p 6381 INFO keyspace
```
