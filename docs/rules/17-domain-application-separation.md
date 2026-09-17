# 17 — Domain / Application Separation Rules

Domain owns:

- invariants
- state transitions
- business constraints
- value semantics
- pure continuity policies

Application owns:

- loading data
- orchestration
- invoking domain behavior
- calling ports
- transaction coordination
- persistence requests

Domain must be testable without DB/network/filesystem/frameworks.

Avoid god services such as `EverythingService` or `ProjectManager` with unrelated responsibilities.
