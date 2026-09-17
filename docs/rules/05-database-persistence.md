# 05 — Database & Persistence Rules

## Default Persistence

Use:

- SQLite
- SQLAlchemy 2.x
- Alembic
- WAL mode

## Storage Responsibilities

### SQLite

Store:

- entities
- metadata
- project structure
- generation jobs
- asset metadata
- timeline data
- version metadata
- lineage metadata

### Filesystem

Store:

- images
- video
- WAV/MP3
- subtitle files
- thumbnails
- temporary downloads
- render outputs

### OS Credential Store

Store:

- provider tokens
- cookies
- refresh credentials
- secret authentication material

## Never Store Large Media as SQLite BLOBs

Use paths and metadata.

## Foreign Keys

Enable SQLite foreign keys.

## Transactions

Operations that change multiple related records must be transactional.

## Job Claiming

Worker job claiming must be atomic.

Two workers must never process the same claimed job simultaneously.

## Database Models vs Domain

SQLAlchemy models are persistence representations.

Do not use them as domain entities outside infrastructure.

## Paths

Persist normalized project-relative paths where appropriate.

Do not assume a fixed machine-specific absolute path when the project can be moved.

## Integrity

Deletion must respect references.

Never delete an asset that is still referenced by:

- active timeline
- approved beat
- current character reference
- render manifest
