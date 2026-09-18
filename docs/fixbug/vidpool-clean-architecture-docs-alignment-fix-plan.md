# VidPool — Clean Architecture, Code Reuse & Documentation Realignment Fix Plan

**Date:** 2026-09-18  
**Repository:** `huongni2201/VidPool`  
**Reviewed baseline:** `main` at `519dc231412dab9761712369294f349b74e99d2b`  
**Primary goal:** đưa repository về một kiến trúc duy nhất, loại bỏ code/docs cũ, xử lý race condition còn hở, xóa duplicate/dead code, buộc tái sử dụng component/service/contracts thay vì tạo implementation song song.  
**Execution style:** TDD + refactor theo phase; mỗi phase phải xanh test trước khi chuyển phase tiếp theo.

---

## 1. Kết quả mong muốn sau khi hoàn tất

Sau plan này, VidPool phải đạt các điều kiện sau:

1. Backend Account Pool có một cơ chế điều phối mutation thống nhất, không còn race giữa:
   - login completion;
   - validate session;
   - acquire/release lease;
   - enable/disable;
   - delete;
   - health-state update;
   - relogin/cancel relogin.

2. Một provider account thực tế không thể được đăng ký thành nhiều account VidPool chỉ vì dùng browser profile khác nhau.

3. Frontend chỉ còn **một cấu trúc FSD canonical**:
   - `app/` = bootstrap, providers, router, root layouts;
   - `pages/` = page composition;
   - `widgets/` = reusable page sections;
   - `features/` = user actions/use-cases;
   - `entities/` = domain-shaped frontend model/UI;
   - `shared/` = framework-neutral/shared primitives.

4. Không còn:
   - `features/dashboard`, `features/projects`, `features/editor`... đóng vai page;
   - `components/shared`;
   - duplicate `StatCard`;
   - hai implementation Account Table/filter;
   - hardcoded operational metrics được trình bày như dữ liệu thật;
   - hardcoded version rải rác;
   - fake user/account badges trong runtime shell.

5. Mỗi responsibility có **một source of truth**:
   - API client: `shared/api`;
   - runtime config: `shared/config`;
   - Account schema: `entities/account`;
   - account queries/actions: `features/account-pool`;
   - login/relogin: `features/account-login`;
   - account table: `widgets/account-table`;
   - common UI: `shared/ui`;
   - router state: React Router;
   - app version: Tauri/app metadata;
   - implementation status: `docs/CURRENT_STATUS.md`.

6. Documentation chỉ giữ:
   - current architecture;
   - current design;
   - ADR history;
   - verification evidence;
   - plan đang còn hiệu lực.

7. Các plan/fixbug cũ đã hoàn tất/superseded phải bị xóa để AI không đọc nhầm như TODO hiện tại.

8. CI phải phát hiện được:
   - FSD boundary violation;
   - duplicate canonical component;
   - forbidden legacy directories/imports;
   - docs manifest drift;
   - version drift;
   - backend concurrency regression;
   - migration regression;
   - package/build regression.

---

# 2. Nguyên tắc thực thi

## 2.1 Không tạo implementation thứ hai

Trước khi tạo file/component/service/helper mới, agent phải tìm trong repository:

```text
1. Có component tương tự không?
2. Có hook/use-case tương tự không?
3. Có API wrapper tương tự không?
4. Có schema/type tương tự không?
5. Có util/helper tương tự không?
6. Có docs hiện hành đã định nghĩa responsibility này chưa?
```

Nếu đã có:

```text
reuse
   ↓
extend
   ↓
refactor nếu abstraction chưa phù hợp
```

Không được:

```text
existing implementation
        +
new parallel implementation
```

## 2.2 One responsibility = one canonical location

Không giữ compatibility wrapper/re-export dài hạn chỉ để tránh migration.

Ví dụ hiện tại:

```text
pages/dashboard/dashboard-page.tsx
        ↓ re-export
features/dashboard/DashboardPage.tsx
```

phải được migrate thành:

```text
pages/dashboard/ui/dashboard-page.tsx
```

và xóa `features/dashboard/`.

## 2.3 Không giữ file “phòng khi cần”

Nếu file không có runtime/test import và không phải public/canonical artifact:

```text
DELETE
```

Git history đã là archive.

Không cần giữ dead code trong source tree.

## 2.4 Docs mô tả implementation phải đúng với code hiện tại

Phân loại docs:

```text
ADR                  = lịch sử quyết định kiến trúc, giữ.
architecture/        = target/current architecture canonical.
design/              = design đang còn hiệu lực.
CURRENT_STATUS       = implementation reality.
verification/        = bằng chứng đã verify, giữ.
plan/fixbug          = chỉ giữ plan chưa hoàn tất hoặc plan hiện hành.
```

Không dùng fix plan cũ làm documentation lâu dài.

---

# 3. Target architecture sau cleanup

## 3.1 Backend

```text
vidpool-backend/app/
├── api/
│   ├── health.py
│   ├── router.py
│   └── session_probe.py
│
├── core/
│   ├── config.py
│   ├── container.py
│   └── security.py
│
├── infrastructure/
│   └── persistence/
│
├── modules/
│   └── accounts/
│       ├── domain/
│       │   ├── account.py
│       │   ├── lease.py
│       │   ├── values.py
│       │   └── errors.py
│       │
│       ├── application/
│       │   ├── service.py
│       │   ├── login_service.py
│       │   ├── lease_service.py
│       │   ├── health_service.py
│       │   ├── ports.py
│       │   ├── queries.py
│       │   ├── mappers.py
│       │   └── uow.py
│       │
│       ├── api/
│       │   ├── router.py
│       │   └── schemas.py
│       │
│       └── infrastructure/
│           ├── browser/
│           ├── persistence/
│           └── providers/
│               └── dreamina/
│
├── factory.py
├── bootstrap.py
└── asgi.py
```

### Module `accounts` owns

```text
ProviderAccount
AccountStatus
AccountLease
provider identity
authentication state
persistent browser profile reference
session validation state
eligibility
cooldown
account leasing
login/relogin lifecycle
provider auth registry
```

### `credentials` không được dùng như tên thay thế cho Account Pool

Nếu sau này có API key/secrets provider:

```text
credentials
```

chỉ sở hữu:

```text
secret reference
API-key metadata
OS keyring integration
```

Không sở hữu browser account lifecycle.

---

## 3.2 Frontend

```text
vidpool-frontend/src/
├── app/
│   ├── layouts/
│   ├── providers/
│   ├── router/
│   ├── styles/
│   └── bootstrap.tsx
│
├── pages/
│   ├── dashboard/
│   │   └── ui/dashboard-page.tsx
│   ├── projects/
│   │   └── ui/projects-page.tsx
│   ├── editor/
│   │   └── ui/editor-page.tsx
│   ├── visual-beat/
│   ├── characters/
│   ├── voice/
│   ├── accounts/
│   ├── jobs/
│   └── settings/
│
├── widgets/
│   ├── sidebar/
│   ├── topbar/
│   ├── account-table/
│   ├── account-pool-summary/
│   └── ...page sections that are actually reused/composed
│
├── features/
│   ├── account-login/
│   ├── account-pool/
│   ├── project-create/
│   ├── project-delete/
│   ├── create-generation/
│   ├── cancel-generation/
│   └── retry-generation/
│
├── entities/
│   ├── account/
│   ├── project/
│   ├── generation/
│   └── job/
│
├── shared/
│   ├── api/
│   ├── config/
│   ├── constants/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   ├── ui/
│   └── demo/
│
└── test/
```

### Dependency direction

```text
app
 ↓
pages
 ↓
widgets
 ↓
features
 ↓
entities
 ↓
shared
```

Không cho phép:

```text
shared   -> entities/features/widgets/pages/app
entities -> features/widgets/pages/app
features -> sibling feature
features -> widgets/pages/app
widgets  -> pages/app
pages    -> app
```

Nếu hai features cần logic chung:

```text
shared primitive
hoặc
entity capability
```

Không import chéo feature.

---

# 4. PHASE 0 — Freeze baseline và tạo safety net

## Task 0.1 — Tạo branch cleanup

```bash
git checkout main
git pull
git checkout -b refactor/clean-architecture-docs-alignment
```

## Task 0.2 — Verify baseline trước khi sửa

Backend:

```bash
cd vidpool-backend
ruff check .
pyright
pytest -q
alembic upgrade head
alembic current
```

Frontend:

```bash
cd vidpool-frontend
pnpm install --frozen-lockfile
pnpm check
```

Desktop Windows:

```bash
python scripts/build-sidecar.py
cd vidpool-frontend
cargo test --locked --manifest-path src-tauri/Cargo.toml
cargo check --locked --manifest-path src-tauri/Cargo.toml
pnpm tauri build
```

Không refactor trên baseline đỏ.

---

# 5. PHASE 1 — Xóa documentation đã cũ / superseded

## 5.1 Xóa fix plan đã hoàn tất hoặc không còn phản ánh HEAD

Xóa:

```text
docs/fixbug/2026-09-17-account-pool-foundation-stabilization.md
docs/fixbug/2026-09-17-vidpool-foundation-account-pool-stabilization-fix-plan.md
docs/fixbug/2026-09-17-vidpool-latest-code-review-detailed-fix-plan.md
docs/fixbug/2026-09-17-vidpool-latest-code-review-fix-plan.md
docs/fixbug/2026-09-17-vidpool-post-dreamina-auth-review-fix-plan.md
docs/fixbug/2026-09-18-vidpool-post-scaffold-stabilization-plan.md
```

Lý do:

- baseline commit đã cũ;
- phần lớn task đã được implement;
- một file đã tự ghi `SUPERSEDED / COMPLETED`;
- giữ chúng cạnh docs canonical khiến AI dễ tái triển khai logic đã xong;
- plan hiện tại thay thế toàn bộ cleanup/fix plan trên.

Sau khi plan này hoàn tất, plan này cũng có thể được chuyển ra khỏi active manifest hoặc xóa nếu team không muốn lưu execution history.

---

## 5.2 Xóa implementation plan đã hoàn tất

Xóa:

```text
docs/plan/2026-09-17-account-pool-browser-session-implementation-plan.md
docs/plan/2026-09-17-vidpool-account-pool-next-phase-implementation-plan.md
docs/plan/2026-09-17-vidpool-dreamina-seedance-auth-implementation-plan.md
```

Lý do:

- Account Pool foundation đã tồn tại;
- Dreamina auth adapter đã tồn tại;
- các plan này không còn là source of truth;
- kiến trúc/ADR/current-status mới là nơi cần giữ thông tin lâu dài.

Nếu còn một task chưa hoàn thành nhưng vẫn cần theo dõi, chuyển task đó vào plan mới thay vì giữ toàn bộ plan cũ.

---

## 5.3 Xóa duplicate design spec

Giữ canonical:

```text
docs/design/2026-09-17-account-pool-browser-session-design.md
```

Xóa:

```text
docs/superpowers/specs/2026-09-17-account-pool-browser-session-design.md
```

Sau đó cập nhật mọi reference trỏ về:

```text
docs/design/2026-09-17-account-pool-browser-session-design.md
```

Không giữ hai bản design cùng nội dung.

---

## 5.4 Không xóa ADR

Giữ:

```text
docs/adr/0001...
...
docs/adr/0017-account-pool-browser-sessions.md
docs/adr/0018-single-owner-playwright-browser-runtime.md
```

ADR là lịch sử quyết định, không phải TODO.

Nếu quyết định bị thay thế:

```text
Status: Superseded
Superseded by: ADR-XXXX
```

Không xóa lịch sử kiến trúc.

---

## 5.5 Không xóa verification evidence

Giữ:

```text
docs/verification/2026-09-17-dreamina-auth-signals.md
docs/verification/2026-09-18-post-scaffold-stabilization.md
```

Nhưng verification phải mô tả rõ:

```text
verified commit
date
command
environment
result
```

Không dùng verification cũ để khẳng định HEAD hiện tại nếu HEAD đã thay đổi behavior liên quan.

---

# 6. PHASE 2 — Viết lại docs theo kiến trúc thật

## Task 2.1 — Rewrite `docs/CURRENT_STATUS.md`

Sửa metadata:

```text
Last reviewed: 2026-09-18
Reviewed commit: <commit sau cleanup>
```

### Chỉ ghi Implemented khi source + test tồn tại

Phần Account Pool nên mô tả:

```text
Implemented:
- provider account aggregate
- persistent isolated browser profiles
- single-owner Playwright runtime
- Dreamina auth adapter/probe
- login/relogin lifecycle
- provider registry
- DB-backed account leases
- protected local account API
- real account-management frontend
```

### Giảm claim FSD

Không ghi:

```text
FSD architecture strictly enforced
```

cho đến khi Phase frontend cleanup hoàn tất.

Sau cleanup mới ghi:

```text
Frontend FSD boundaries are enforced by architecture tests:
- page implementations live in pages/
- user actions live in features/
- entities do not depend on features/widgets/pages/app
- canonical shared primitives live only in shared/
- legacy components/shared and page-shaped feature directories are absent
```

### Ghi rõ prototype reality

```text
Project, dashboard, characters, voice, editor, jobs and generation screens may contain demo/presentation data until corresponding production backend modules exist.
Demo data is explicitly isolated under shared/demo and is not presented as verified operational state.
```

---

## Task 2.2 — Rewrite `docs/design/UI-SOURCE-OF-TRUTH.md`

### Sửa mapping cũ

Xóa mapping:

```text
src/features/accounts/
```

Thay bằng:

```text
pages/accounts/ui/accounts-page.tsx
features/account-login/
features/account-pool/
widgets/account-table/
entities/account/
```

### Xóa mapping không tồn tại

Không claim:

```text
src/features/workspace/
```

nếu source chưa có.

Mô tả workspace là target design hoặc map đúng vào các page hiện tại:

```text
pages/editor/
pages/visual-beat/
pages/characters/
pages/voice/
pages/jobs/
```

### Tách rõ 3 trạng thái UI

Mỗi section phải dùng label:

```text
IMPLEMENTED
DEMO / PROTOTYPE
PLANNED
```

Ví dụ Account Pool:

```text
IMPLEMENTED:
- provider discovery
- add/login
- relogin
- validate
- enable/disable
- delete
- account status
- last validation
- cooldown

PLANNED:
- provider quotas
- stamina
- credits
- quota reset
- generation assignment
```

Không mô tả mock metrics như capability runtime.

---

## Task 2.3 — Rewrite `docs/architecture/module-boundaries.md`

Thêm module:

```markdown
## accounts

Owns:

- ProviderAccount
- AccountStatus
- AccountLease
- provider identity
- authentication/session state
- persistent browser profile reference
- account eligibility
- cooldown
- login/relogin lifecycle
- provider auth registry
```

Sửa `credentials`:

```markdown
## credentials

Only introduce/retain this module for non-browser secrets such as:
- API key references
- OS-keyring secret references
- secret rotation metadata

Browser-authenticated provider accounts belong to `accounts`, not `credentials`.
```

Nếu chưa có production credential module:

```text
Target / planned boundary
```

không mô tả như implemented code.

---

## Task 2.4 — Tạo `docs/architecture/frontend-architecture.md`

Nội dung bắt buộc:

```text
layer responsibilities
allowed imports
forbidden imports
page vs feature distinction
widget criteria
entity criteria
shared criteria
where TanStack Query belongs
where Zustand belongs
API DTO validation with Zod
demo-data policy
component reuse policy
barrel export policy
test location policy
```

### Rule quan trọng

`features/` không phải nơi bỏ mọi màn hình.

Feature phải trả lời được câu:

```text
User đang thực hiện hành động/use-case gì?
```

Ví dụ hợp lệ:

```text
account-login
account-pool
project-create
project-delete
retry-generation
```

Không hợp lệ:

```text
dashboard
settings
voice
characters
editor
projects
```

nếu directory đó chỉ chứa whole-page UI.

---

## Task 2.5 — Rewrite `DOCS-MANIFEST.md`

Manifest mới phải chứa canonical docs hiện tại.

Ít nhất:

```text
AGENTS.md
ARCHITECTURE-CHECKLIST.md
README.md
docs/CURRENT_STATUS.md

docs/adr/0001...0018
docs/architecture/*
docs/design/UI-SOURCE-OF-TRUTH.md
docs/design/2026-09-17-account-pool-browser-session-design.md
docs/rules/*
docs/verification/*
```

Không đưa completed fix plan cũ vào manifest.

---

## Task 2.6 — Thêm docs validation

Tạo:

```text
scripts/check-docs.py
```

Check:

1. mọi path trong `DOCS-MANIFEST.md` tồn tại;
2. manifest có ADR `0017`, `0018`;
3. không reference `src/features/accounts`;
4. không reference `src/features/workspace` nếu directory không tồn tại;
5. không reference file docs đã xóa;
6. `CURRENT_STATUS` có reviewed date/commit;
7. không có hai active docs cùng canonical title cho Account Pool browser-session design.

Chạy trong CI.

---

# 7. PHASE 3 — Fix backend concurrency correctness

## Current problem

`AccountService._mutation_lock` hiện chỉ bao phủ một số mutation.

Đã lock:

```text
disable_account
delete_account
cancel_new_login
start_relogin
acquire
validate_account
```

Chưa lock đầy đủ:

```text
complete_login
enable_account
cancel_relogin
release
report_success
report_auth_failure
report_temporary_failure
report_rate_limited
```

Điều này cho phép stale aggregate ghi đè state mới hơn.

---

## Task 3.1 — Viết regression tests trước

Thêm các tests vào:

```text
tests/accounts/test_account_concurrency.py
```

### Test A — complete login vs disable

Invariant:

```text
account không được ACTIVE sau khi disable đã thắng mutation order.
```

### Test B — complete login vs delete

Invariant:

```text
không được resurrect account đã delete.
```

### Test C — report auth failure vs disable

Invariant:

```text
DISABLED không được bị chuyển lại AUTH_REQUIRED bởi stale health update.
```

### Test D — report success vs disable

Invariant:

```text
DISABLED không được bị revive ACTIVE.
```

### Test E — release/acquire consistency

Invariant:

```text
không có duplicate unexpired lease trên cùng account.
```

### Test F — complete login vs acquire

Invariant:

```text
AUTH_REQUIRED login flow chưa hoàn tất không được lease.
```

---

## Task 3.2 — Chuẩn hóa mutation coordination

### Phase này ưu tiên correctness, không premature optimize

Giữ một coordinator tại `AccountService`.

Refactor:

```python
class AccountService:
    def __init__(...):
        self._mutation_lock = threading.RLock()
```

Mọi operation thay đổi account/lease lifecycle phải đi qua lock này.

Bọc:

```text
complete_login
enable_account
disable_account
delete_account
start_relogin
cancel_relogin
cancel_new_login
validate_account
acquire
release
report_success
report_auth_failure
report_temporary_failure
report_rate_limited
```

Read-only không cần:

```text
list_providers
list_accounts
get_account
```

### Chấp nhận tradeoff

Dreamina validation có thể giữ lock trong provider/browser I/O.

VidPool hiện là:

```text
single-user
local desktop
single backend process
```

nên correctness quan trọng hơn throughput.

Không tạo keyed-lock framework phức tạp trước khi có evidence cần tối ưu.

Sau này nếu provider execution concurrent lớn:

```text
ADR mới
+ DB optimistic concurrency/version
+ fine-grained account locks
```

---

## Task 3.3 — Không để sub-service bypass facade coordination

`AccountLoginService`, `AccountLeaseService`, `AccountHealthService` là internal application services.

Rule:

```text
API/router/worker -> AccountService facade
```

Không inject các sub-service trực tiếp vào API hoặc worker.

Thêm architecture test hoặc code comment rõ:

```text
AccountService owns cross-operation invariants.
```

---

# 8. PHASE 4 — Chống duplicate provider identity

## Problem

Hiện DB unique theo:

```text
profile_key
```

nhưng một real provider identity có thể login qua nhiều profile.

Kết quả:

```text
VidPool Account A -> Dreamina user X
VidPool Account B -> Dreamina user X
```

LRU tưởng đây là 2 account.

---

## Task 4.1 — Thêm domain error

Trong:

```text
modules/accounts/domain/errors.py
```

thêm:

```python
class DuplicateProviderIdentity(AccountError):
    pass
```

---

## Task 4.2 — Thêm repository lookup

Port:

```python
get_by_provider_identity(
    provider_key: str,
    external_identity: str,
) -> ProviderAccount | None
```

Implement trong SQLAlchemy repository.

---

## Task 4.3 — Thêm DB unique constraint

Model:

```python
UniqueConstraint(
    "provider_key",
    "external_identity",
    name="uq_provider_account_identity",
)
```

SQLite cho phép nhiều `NULL`, phù hợp với provisional account trước khi login complete.

Tạo Alembic migration mới.

Không sửa migration cũ đã tồn tại.

---

## Task 4.4 — Check trong `complete_login`

Sau khi resolve identity:

```text
identity = provider.resolve_identity(profile)
```

trước khi mark authenticated:

```text
existing = repo.get_by_provider_identity(provider_key, external_identity)
```

Nếu:

```text
existing != current account
```

thì:

```text
raise DuplicateProviderIdentity
```

API map:

```text
409 Conflict
```

UI message:

```text
Tài khoản provider này đã được thêm vào VidPool.
```

### DB unique constraint vẫn là final guard

Application pre-check = UX.

DB constraint = race-condition safety.

---

## Task 4.5 — Cleanup provisional duplicate

Nếu login mới phát hiện identity duplicate:

```text
close provisional browser
delete provisional DB account
delete provisional browser profile
preserve existing account
```

Không để ghost provisional account.

Regression test bắt buộc.

---

# 9. PHASE 5 — Clean BrowserRuntime boundary

## Task 5.1 — Chuẩn hóa browser operation timeout

Không để FastAPI request có khả năng đợi vô hạn.

Define config:

```text
browser_launch_timeout
navigation_timeout
provider_probe_timeout
shutdown_timeout
```

Ưu tiên timeout thực thi ở Playwright/provider-operation boundary.

Ví dụ:

```text
goto(... timeout=...)
probe operations use bounded waits
```

Không chỉ thêm `Future.result(timeout=...)` rồi để command tiếp tục chạy âm thầm mà không quản lý.

Nếu cần watchdog cho BrowserRuntime thì thiết kế riêng và test rõ lifecycle.

---

## Task 5.2 — Chuẩn hóa error taxonomy

Browser/provider technical failure:

```text
BrowserUnavailable
BrowserLaunchFailed
ProviderUnavailable
```

Confirmed auth invalid:

```text
SessionInvalid / SessionValidation(valid=False)
```

Không map provider outage thành `AUTH_REQUIRED`.

Giữ behavior hiện có và bổ sung regression test.

---

# 10. PHASE 6 — Frontend FSD cleanup

## Task 6.1 — Migrate page-shaped features về `pages/`

Hiện tại cần loại:

```text
src/features/dashboard/
src/features/projects/
src/features/editor/
src/features/characters/
src/features/jobs/
src/features/settings/
src/features/visual-beat/
src/features/voice/
```

### Migrate implementation

Ví dụ:

```text
src/features/dashboard/DashboardPage.tsx
```

→

```text
src/pages/dashboard/ui/dashboard-page.tsx
```

Tương tự cho tất cả page.

Sau đó:

```text
DELETE re-export wrappers
DELETE old feature directories
```

Không giữ:

```text
pages -> re-export -> features page
```

---

## Task 6.2 — Sửa feature-to-feature imports

Ví dụ Dashboard đang dùng:

```text
Dashboard page
  -> project-create feature
```

Sau khi Dashboard nằm đúng trong `pages/`, import đó hợp lệ:

```text
pages -> features
```

Architecture trở nên đúng tự nhiên.

Không cần exception.

---

# 11. PHASE 7 — Xóa duplicate common components

## Confirmed exact duplicate

Hai file có cùng Git blob hash:

```text
src/components/shared/StatCard.tsx
src/shared/ui/stat-card.tsx
```

Canonical:

```text
src/shared/ui/stat-card.tsx
```

Xóa:

```text
src/components/shared/StatCard.tsx
```

Migrate imports:

```text
@/components/shared/StatCard
```

→

```text
@/shared/ui
```

---

## Task 7.2 — Migrate các common component còn lại

Hiện có:

```text
src/components/shared/StatusBadge.tsx
src/components/shared/WaveformVisualizer.tsx
```

### StatusBadge

Nếu generic visual component:

```text
shared/ui/status-badge.tsx
```

Nếu badge encode business state của entity cụ thể:

```text
entities/<entity>/ui/*
```

Không để ở `components/shared`.

### WaveformVisualizer

Là generic visual component:

```text
shared/ui/waveform-visualizer.tsx
```

Sau migration:

```text
DELETE src/components/shared/
```

Thêm architecture test:

```text
src/components/ must not exist
```

hoặc nếu sau này cần `components/`, phải có ADR mới; mặc định FSD không dùng layer này.

---

# 12. PHASE 8 — Canonicalize Account Table, không render list hai lần

## Problem

Hiện tồn tại:

```text
widgets/account-table/ui/account-table.tsx
```

nhưng:

```text
pages/accounts/accounts-page.tsx
```

tự làm lại:

```text
search
provider filter
empty/loading
account list
AccountRow mapping
```

Đây là duplicated responsibility.

---

## Target

```text
AccountsPage
├── AccountPoolSummary
├── AccountToolbar
├── AccountTable
└── AddAccountDialog
```

### `AccountTable` sở hữu

```text
search
status filter
provider filter nếu filter local
loading state
empty state
AccountRow rendering
```

### Page sở hữu

```text
query composition
page header
provider query
login target
account mutation integration
page-level error
```

### Metrics

Tách:

```text
widgets/account-pool-summary/
```

Input:

```ts
accounts: AccountSummary[]
```

Derive:

```text
total
active
auth_required
cooldown
disabled
```

Không duplicate metric calculation ở nhiều page.

---

# 13. PHASE 9 — Tách demo/prototype data khỏi runtime business state

## Problem

Dashboard/Projects/Sidebar/Project store đang chứa fake data.

Ví dụ:

```text
12 projects
48 videos
2.6 hours
12.6 GB
3 jobs
5 accounts
Thanh Xuân Trở Lại
user@vidpool.ai
Pro
hardcoded date 2025
```

---

## Task 9.1 — Tạo explicit demo-data module

```text
src/shared/demo/
├── projects.ts
├── jobs.ts
├── characters.ts
├── assets.ts
└── index.ts
```

Mọi fake/prototype value phải import từ đây.

Không khai báo demo arrays trực tiếp trong page.

---

## Task 9.2 — Không giả operational truth

Những thông tin đã có backend thật phải lấy thật.

Ví dụ Account Pool summary trên Dashboard:

```text
useAccounts()
```

hoặc reusable account summary query/widget.

Không hardcode:

```text
5 total
3 active
```

---

## Task 9.3 — Chưa có backend thì label rõ demo

Các module chưa production:

```text
projects
jobs
characters
voice
generation
```

Nếu vẫn cần UI prototype:

```text
Demo / Preview
```

hoặc UI copy không được khiến user hiểu đây là current persisted runtime state.

---

## Task 9.4 — Sửa Zustand project store

Không initialize:

```ts
activeProject: { id: "p1", ... }
projectName: "Thanh Xuân Trở Lại"
```

Thay:

```ts
activeProject: null
projectName: ""
savedTime: null
isProjectOpen: false
```

Demo project phải được truyền từ demo page/action, không sống trong canonical state.

---

## Task 9.5 — Sidebar

Xóa fake:

```text
Account badge "8"
Jobs badge "3"
user@vidpool.ai
Pro
```

Nếu data thật chưa có:

```text
không render badge
```

Single-user local app không cần fake cloud-user card.

Bottom area chỉ nên hiển thị:

```text
backend health
app version
settings
```

---

# 14. PHASE 10 — API client reuse và error handling

## Problem

`get`, `post`, `delete` đang duplicate:

```text
build URL
fetch
check response
parse error
parse schema
```

POST có đọc FastAPI `detail`, GET/DELETE chưa đồng nhất.

---

## Task 10.1 — Tạo `ApiError`

```ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly path: string,
  ) {
    super(detail)
  }
}
```

Không lưu bearer token/body secrets vào error.

---

## Task 10.2 — Tạo private `request`

Trong `shared/api/api-client.ts`:

```ts
async function request<T>(
  method,
  path,
  options,
  schema?,
): Promise<T>
```

`get/post/delete` chỉ là thin wrapper.

Một chỗ duy nhất chịu trách nhiệm:

```text
URL
Authorization
Content-Type
JSON body
FastAPI detail parsing
Zod parsing
empty response
ApiError
```

---

## Task 10.3 — Không tạo API abstraction mới ngoài `shared/api`

Architecture test cấm:

```text
src/lib/api*
src/runtime/runtime-config*
src/app/api-client-context*
```

Các path legacy đã xóa phải tiếp tục bị cấm.

---

# 15. PHASE 11 — Version source of truth

## Problem hiện tại

```text
package.json         0.0.0
tauri.conf.json      0.1.0
UI/sidebar           0.2.0
UI design doc        0.2.0-alpha
```

---

## Target

Tauri application version là canonical runtime app version.

UI desktop dùng:

```ts
import { getVersion } from "@tauri-apps/api/app"
```

Browser-dev fallback:

```text
DEV
```

Không hardcode version trong component.

Đồng bộ package/Cargo/Tauri version hoặc thêm script check consistency.

Tạo:

```text
scripts/check-version-sync.mjs
```

CI fail nếu metadata release không đồng bộ.

---

# 16. PHASE 12 — Dead code / unused code cleanup

## Task 12.1 — Thêm `knip`

Thêm dev dependency:

```bash
pnpm add -D knip
```

Config ignore hợp lý cho:

```text
Vite entry
Tauri generated types nếu có
test fixtures
```

Chạy:

```bash
pnpm knip
```

Mục tiêu:

```text
0 unintended unused files
0 unintended unused exports
0 unintended unused dependencies
```

Không blindly delete dynamic entry points; verify trước.

---

## Task 12.2 — Review barrel exports

Giữ barrel chỉ khi tạo public API cho slice.

Ví dụ:

```text
features/account-pool/index.ts
entities/account/index.ts
shared/ui/index.ts
```

Không tạo `index.ts` chỉ để export đúng một internal file nếu slice không cần public API.

Rule:

```text
outside slice -> import slice public API
inside slice  -> relative internal import
```

---

# 17. PHASE 13 — Architecture tests mạnh hơn

Mở rộng:

```text
src/test/architecture/import-boundaries.test.ts
```

## Tests bắt buộc

### A. Legacy directories absent

```text
src/components/shared
src/features/dashboard
src/features/projects
src/features/editor
src/features/characters
src/features/jobs
src/features/settings
src/features/visual-beat
src/features/voice
```

phải không tồn tại.

### B. Sibling feature import forbidden

Không:

```text
features/A -> features/B
```

### C. Shared upward dependency forbidden

Không:

```text
shared -> entities/features/widgets/pages/app
```

### D. Entity upward dependency forbidden

Không:

```text
entities -> features/widgets/pages/app
```

### E. Page implementation not re-export wrapper

Page phải chứa actual page composition hoặc explicit page public API, không dùng compatibility indirection về page-shaped feature.

### F. Canonical API only

Cấm:

```text
lib/api-client
runtime/runtime-config
app/api-client-context
```

### G. Remote runtime assets

Giữ CSP test:

```text
no remote image dependency
```

---

# 18. PHASE 14 — Duplicate detection trong CI

Tạo script:

```text
scripts/check-source-duplicates.py
```

Scan source text files:

```text
*.py
*.ts
*.tsx
```

Có thể normalize:

```text
trim whitespace
ignore tiny barrel/__init__ files
```

Fail khi hai non-trivial files có identical normalized content.

Mục tiêu là bắt lại case:

```text
components/shared/StatCard.tsx
shared/ui/stat-card.tsx
```

Không cố làm clone detector phức tạp trong phase đầu.

Exact/near-exact duplicate detection + code review là đủ.

---

# 19. PHASE 15 — Backend clean-code cleanup

## Task 15.1 — Remove compatibility aliases không cần thiết

Review:

```python
_to_view = account_to_view
```

Nếu không phục vụ injection/test:

```text
use account_to_view directly
```

Tránh alias không tăng abstraction.

---

## Task 15.2 — API error mapping

Hiện `_handle_error()` dùng central function trong router — hướng này ổn cho module nhỏ.

Refactor khi cần:

```text
domain/application error -> HTTP mapping
```

nhưng không đưa HTTP exception vào service/domain.

Thêm mapping:

```text
DuplicateProviderIdentity -> 409
```

---

## Task 15.3 — Repository remains persistence-only

Repository không:

```text
commit
provider call
browser call
FastAPI
business orchestration
```

UoW tiếp tục sở hữu commit/rollback.

---

## Task 15.4 — Preserve aggregate transitions

Application service không set raw:

```python
account.status = ...
```

Dùng domain methods.

Nếu transition mới cần:

```text
thêm domain method + unit test
```

---

# 20. PHASE 16 — Frontend reusable UI consolidation

## Canonical `shared/ui`

Sau cleanup nên có:

```text
badge.tsx
button.tsx
card.tsx
input.tsx
stat-card.tsx
status-badge.tsx
waveform-visualizer.tsx
```

Mỗi component phải có responsibility generic.

Business-specific UI:

```text
AccountStatusBadge
ProjectStatusBadge
GenerationStatusBadge
```

đặt trong entity tương ứng.

Không làm một giant `StatusBadge` với mọi domain status nếu business semantics khác nhau.

### Recommended refactor

```text
components/shared/StatusBadge.tsx
```

nếu chỉ dùng prototype nhiều domain:

- hoặc chuyển thành `shared/ui/status-badge.tsx` chỉ nhận visual `tone`;
- entity/page map status -> tone.

Ví dụ:

```tsx
<StatusBadge tone="success">Hoàn thành</StatusBadge>
```

thay vì shared component tự biết toàn bộ Vietnamese business status strings.

Điều này giảm coupling.

---

# 21. PHASE 17 — StatCard semantic fix

Hiện:

```ts
trend.direction === "up"
  ? "text-emerald-400"
  : "text-emerald-400"
```

Không map color từ direction.

Refactor API:

```ts
trend?: {
  direction: "up" | "down"
  sentiment?: "positive" | "negative" | "neutral"
  text: string
}
```

Hoặc tốt hơn:

```ts
trend?: {
  icon: "up" | "down"
  tone: "success" | "danger" | "neutral"
  text: string
}
```

Vì:

```text
processing time DOWN = positive
error count DOWN = positive
revenue DOWN = negative
```

Direction không đồng nghĩa sentiment.

---

# 22. PHASE 18 — CURRENT_STATUS và README final alignment

Sau code cleanup mới sửa final status.

README phải chỉ nói:

```text
how to run
target stack
verified platform
architecture entry points
docs semantics
development mode
```

Không copy chi tiết implementation dài từ `CURRENT_STATUS`.

`CURRENT_STATUS` mới là implementation reality.

`UI-SOURCE-OF-TRUTH` là target UI.

`architecture/` là architecture.

`ADR` là history.

Không duplicate cùng một truth ở nhiều file.

---

# 23. PHASE 19 — CI final gates

`.github/workflows/ci.yml`

## Frontend

```bash
pnpm lint
pnpm test:run
pnpm build
pnpm knip
python ../scripts/check-source-duplicates.py
node ../scripts/check-version-sync.mjs
python ../scripts/check-docs.py
```

Có thể gom lại trong:

```bash
pnpm check
```

nếu script names rõ.

---

## Backend

```bash
ruff check .
pyright
pytest -q
alembic upgrade head
alembic current
```

Thêm focused concurrency tests bắt buộc.

---

## Desktop

```text
build sidecar
browser runtime smoke test
cargo test
cargo check
pnpm tauri build
```

Không claim packaged app verified nếu `pnpm tauri build` chưa pass.

---

# 24. Test matrix bắt buộc

## Backend domain

```text
account transitions
disabled invariant
cooldown
identity uniqueness behavior
lease expiry
```

## Backend application

```text
login lifecycle
relogin lifecycle
cancel cleanup
validate
enable/disable
delete
duplicate identity
provider unavailable
```

## Backend concurrency

```text
acquire vs acquire
acquire vs disable
acquire vs delete
acquire vs relogin
acquire vs validate
complete-login vs disable
complete-login vs delete
health-update vs disable
```

## Persistence

```text
unique profile
unique provider identity
one unexpired/current lease constraint behavior
LRU
expired lease cleanup
Alembic upgrade
```

## Frontend

```text
account list
filters
provider select
add account
relogin
validate
enable
disable
delete
API errors
backend unavailable
empty state
```

## Architecture

```text
FSD layer boundaries
legacy paths absent
no exact source duplicates
docs references valid
version metadata valid
no remote demo image URL
```

---

# 25. File-level execution checklist

## DELETE

```text
docs/fixbug/2026-09-17-account-pool-foundation-stabilization.md
docs/fixbug/2026-09-17-vidpool-foundation-account-pool-stabilization-fix-plan.md
docs/fixbug/2026-09-17-vidpool-latest-code-review-detailed-fix-plan.md
docs/fixbug/2026-09-17-vidpool-latest-code-review-fix-plan.md
docs/fixbug/2026-09-17-vidpool-post-dreamina-auth-review-fix-plan.md
docs/fixbug/2026-09-18-vidpool-post-scaffold-stabilization-plan.md

docs/plan/2026-09-17-account-pool-browser-session-implementation-plan.md
docs/plan/2026-09-17-vidpool-account-pool-next-phase-implementation-plan.md
docs/plan/2026-09-17-vidpool-dreamina-seedance-auth-implementation-plan.md

docs/superpowers/specs/2026-09-17-account-pool-browser-session-design.md

vidpool-frontend/src/components/shared/StatCard.tsx
vidpool-frontend/src/components/shared/StatusBadge.tsx
vidpool-frontend/src/components/shared/WaveformVisualizer.tsx

vidpool-frontend/src/features/dashboard/
vidpool-frontend/src/features/projects/
vidpool-frontend/src/features/editor/
vidpool-frontend/src/features/characters/
vidpool-frontend/src/features/jobs/
vidpool-frontend/src/features/settings/
vidpool-frontend/src/features/visual-beat/
vidpool-frontend/src/features/voice/
```

> Chỉ delete feature directories sau khi code đã được migrate sang `pages/`.

---

## MODIFY

```text
DOCS-MANIFEST.md
README.md
docs/CURRENT_STATUS.md
docs/design/UI-SOURCE-OF-TRUTH.md
docs/architecture/module-boundaries.md

vidpool-backend/app/modules/accounts/application/service.py
vidpool-backend/app/modules/accounts/application/login_service.py
vidpool-backend/app/modules/accounts/application/ports.py
vidpool-backend/app/modules/accounts/domain/errors.py
vidpool-backend/app/modules/accounts/infrastructure/persistence/models.py
vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py
vidpool-backend/app/modules/accounts/api/router.py

vidpool-frontend/src/shared/api/api-client.ts
vidpool-frontend/src/shared/ui/index.ts
vidpool-frontend/src/widgets/account-table/ui/account-table.tsx
vidpool-frontend/src/pages/accounts/*
vidpool-frontend/src/widgets/sidebar/*
vidpool-frontend/src/entities/project/model/project-store.ts
vidpool-frontend/src/test/architecture/import-boundaries.test.ts
vidpool-frontend/package.json

.github/workflows/ci.yml
```

---

## CREATE

```text
docs/architecture/frontend-architecture.md

new Alembic migration for provider identity uniqueness

vidpool-frontend/src/shared/ui/status-badge.tsx
vidpool-frontend/src/shared/ui/waveform-visualizer.tsx

vidpool-frontend/src/shared/demo/
vidpool-frontend/src/widgets/account-pool-summary/

scripts/check-docs.py
scripts/check-source-duplicates.py
scripts/check-version-sync.mjs
```

Có thể không cần create `status-badge.tsx` generic nếu sau review xác định mọi status badge đều entity-specific.

---

# 26. Commit sequence đề xuất

Không gộp toàn bộ vào một giant commit.

## Commit 1

```text
test: cover remaining account mutation races
```

## Commit 2

```text
fix: serialize account lifecycle mutations
```

## Commit 3

```text
feat: enforce unique provider account identity
```

## Commit 4

```text
refactor: move page implementations to canonical FSD pages
```

## Commit 5

```text
refactor: consolidate shared frontend UI primitives
```

## Commit 6

```text
refactor: reuse account table and account pool summary widgets
```

## Commit 7

```text
refactor: isolate demo data from runtime state
```

## Commit 8

```text
refactor: consolidate frontend API error handling
```

## Commit 9

```text
chore: remove dead code and enforce unused-code checks
```

## Commit 10

```text
docs: remove superseded plans and realign architecture docs
```

## Commit 11

```text
ci: enforce docs version architecture and duplicate gates
```

---

# 27. Definition of Done

Plan chỉ hoàn tất khi tất cả điều kiện dưới đây đúng.

## Backend

- [ ] `complete_login` không race với disable/delete.
- [ ] health updates không revive disabled accounts.
- [ ] all Account Pool lifecycle mutations đi qua một coordination boundary.
- [ ] duplicate `(provider_key, external_identity)` bị reject.
- [ ] duplicate-login provisional account/profile được cleanup.
- [ ] migration upgrade pass.
- [ ] Ruff pass.
- [ ] Pyright pass.
- [ ] Pytest pass.

## Frontend architecture

- [ ] Không còn `src/components/shared`.
- [ ] Không còn page-shaped `features/dashboard|projects|editor|...`.
- [ ] Không còn page re-export wrappers sang old feature pages.
- [ ] `StatCard` chỉ có một canonical implementation.
- [ ] Account list/filter rendering chỉ có một canonical widget.
- [ ] API fetch/error parsing chỉ có một implementation.
- [ ] no sibling feature imports.
- [ ] architecture tests pass.

## Runtime truthfulness

- [ ] Sidebar không hardcode fake account/job count.
- [ ] Không có fake `user@vidpool.ai` / `Pro`.
- [ ] Project store không khởi tạo fake active project.
- [ ] Account Pool operational state lấy từ backend thật.
- [ ] Demo project/job/character data nằm trong explicit `shared/demo`.
- [ ] Không có hardcoded historical date được trình bày như current date.

## Documentation

- [ ] Completed/superseded fix plans đã xóa.
- [ ] Completed implementation plans đã xóa.
- [ ] Duplicate superpowers design đã xóa.
- [ ] ADR 0017/0018 vẫn giữ.
- [ ] Verification docs vẫn giữ.
- [ ] `DOCS-MANIFEST.md` khớp filesystem.
- [ ] `CURRENT_STATUS.md` khớp implementation.
- [ ] `UI-SOURCE-OF-TRUTH.md` không reference path đã xóa.
- [ ] `module-boundaries.md` mô tả `accounts` đúng ownership.
- [ ] frontend architecture có canonical doc.
- [ ] docs validation pass.

## Version / build

- [ ] Không còn hardcoded `v0.2.0` trong sidebar.
- [ ] App version lấy từ canonical runtime metadata.
- [ ] version sync test pass.
- [ ] `pnpm check` pass.
- [ ] `pnpm knip` pass.
- [ ] duplicate-source check pass.
- [ ] desktop sidecar smoke pass.
- [ ] cargo test pass.
- [ ] cargo check pass.
- [ ] full `pnpm tauri build` pass.

---

# 28. Gate trước giai đoạn tiếp theo

Không triển khai Seedance generation execution / durable provider jobs cho đến khi:

```text
P1 backend concurrency
+
provider identity uniqueness
+
frontend canonical architecture
+
docs cleanup
+
CI architecture gates
```

đều hoàn tất.

Sau cleanup, thứ tự feature tiếp theo nên là:

```text
Account Pool stable
        ↓
Provider capability contract
        ↓
Seedance execution adapter
        ↓
Durable generation jobs
        ↓
Lease integration
        ↓
Download/artifact persistence
        ↓
Project/domain persistence
```

Không quay lại thêm UI mock trước khi contract backend tương ứng tồn tại.

---

# 29. Rule dành cho AI/code agent sau cleanup

Khi implement bất kỳ feature mới nào:

```text
SEARCH BEFORE CREATE
REUSE BEFORE ABSTRACT
EXTEND BEFORE DUPLICATE
DELETE DEAD CODE
ONE SOURCE OF TRUTH
DOCS MUST MATCH CODE
TEST THE BOUNDARY
```

Cụ thể:

1. Search repository trước khi tạo component/hook/service/schema.
2. Không tạo `FooV2`, `NewFoo`, `Foo2` để tránh refactor code cũ.
3. Không tạo second API client.
4. Không tạo second account schema.
5. Không tạo second status mapping nếu entity đã sở hữu mapping.
6. Không copy component sang folder khác.
7. Nếu move file, migrate imports và delete old file trong cùng commit.
8. Nếu architecture thay đổi, update architecture doc + CURRENT_STATUS cùng commit.
9. Nếu một plan đã hoàn tất, không để nó tiếp tục nằm trong active docs manifest.
10. Git history là nơi lưu code/docs cũ; repository hiện tại chỉ nên chứa truth hiện hành.
