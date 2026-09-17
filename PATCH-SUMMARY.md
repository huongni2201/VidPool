# VidPool Docs Fix Summary

Files to replace/create:

## Replace
- `AGENTS.md`
- `docs/architecture/README.md`
- `docs/architecture/generation-flow.md`
- `docs/adr/README.md`

## Create
- `ARCHITECTURE-CHECKLIST.md`
- `docs/CURRENT_STATUS.md`
- `docs/architecture/python-backend-architecture.md`
- `docs/architecture/module-boundaries.md`
- `docs/architecture/dependency-map.md`
- `docs/adr/0016-use-modular-monolith-clean-hexagonal-backend.md`

Primary fixes:
1. Correct Clean/Hexagonal source dependency direction.
2. Persist durable generation jobs before remote provider execution.
3. Separate target architecture from current implementation status.
4. Add missing Python architecture documentation.
5. Add architecture review checklist.
6. Make `AGENTS.md` reference rules 16–26.
7. Record the backend architecture in ADR-0016.
