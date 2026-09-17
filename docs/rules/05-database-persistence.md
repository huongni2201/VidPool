# 05 — Database & Persistence Rules

Use:

- SQLite
- SQLAlchemy 2.x
- Alembic
- WAL mode
- foreign keys enabled

## Storage

SQLite:

- entities
- metadata
- jobs
- timeline
- versions
- lineage
- credential metadata

Filesystem:

- images
- video
- audio
- subtitles
- thumbnails
- renders
- temp downloads

OS credential store:

- tokens
- cookies
- refresh credentials
- provider secrets

Never store large media as SQLite BLOBs.

SQLAlchemy models stay in infrastructure.

Multi-write use cases require a transaction boundary.
