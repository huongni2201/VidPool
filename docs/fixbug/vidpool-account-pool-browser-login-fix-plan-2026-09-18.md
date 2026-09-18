# VidPool — Account Pool Browser Login Fix Plan

**Review date:** 2026-09-18  
**Repository:** `huongni2201/VidPool`  
**Reviewed branch:** `main`  
**Reviewed HEAD:** `2153e7ae5c9dbded4676fb53ad07d526d70564e2`  
**HEAD commit:** `feat: add chapter and visual beat pages along with core types, api, and tests`

---

## 1. Mục tiêu của batch này

Batch này chỉ tập trung đưa **Account Pool browser login** về trạng thái hoạt động end-to-end và có thể debug được trên desktop thật.

Milestone bắt buộc:

```text
Thêm tài khoản
→ chọn Dreamina
→ backend nhận start_login
→ Edge/Chrome mở bằng persistent profile riêng
→ Dreamina được điều hướng trong browser
→ user đăng nhập thủ công
→ quay lại VidPool và bấm "Đã đăng nhập"
→ backend xác minh session + resolve identity
→ account chuyển sang trạng thái phù hợp
→ đóng/mở lại app
→ persisted browser profile vẫn sử dụng được
```

### Ngoài scope

Không triển khai trong batch này:

- Chapter backend
- Chapter database
- Story Engine
- Visual Beat backend
- Character Engine
- provider execution job
- Seedance video submit/poll/download
- durable job worker
- GPU pipeline
- TTS
- FFmpeg/render pipeline

Các màn hình Chapter / Visual Beat hiện được coi là **UI prototype để chốt nghiệp vụ**, không review như production backend feature trong batch này.

---

# 2. Kết quả review source mới nhất

## P0-01 — Commit mới đã xóa toàn bộ `scripts/` nhưng CI vẫn gọi các script này

Trong diff:

```text
b1b7f68d
→
2153e7ae
```

commit mới đã xóa:

```text
scripts/build-sidecar.py
scripts/check-docs.py
scripts/check-source-duplicates.py
scripts/check-version-sync.mjs
scripts/smoke-browser-profile.py
```

Trong khi `.github/workflows/ci.yml` hiện vẫn chạy:

```text
node ../scripts/check-version-sync.mjs
python ../scripts/check-docs.py
python ../scripts/check-source-duplicates.py
python scripts/build-sidecar.py
```

### Hậu quả

Tree hiện tại và CI không đồng bộ.

Desktop sidecar build cũng không còn command chuẩn để package:

```text
FastAPI backend
→ PyInstaller
→ vidpool-backend-<target-triple>.exe
→ Tauri externalBin
```

Đây là regression P0 độc lập với Chapter.

### Hướng fix

Khôi phục các script cần thiết từ commit trước:

```text
b1b7f68db167ac2b980d944ea96e629f8feca52d
```

Nhưng không copy mù.

Phải review lại từng script theo HEAD mới trước khi commit.

### Bắt buộc khôi phục

```text
scripts/build-sidecar.py
scripts/check-docs.py
scripts/check-source-duplicates.py
scripts/check-version-sync.mjs
```

### `smoke-browser-profile.py`

Nên khôi phục vì đây là manual integration test hữu ích cho:

- persistent profile
- profile isolation
- delete profile
- restart BrowserRuntime

Tuy nhiên phải cập nhật nó nếu BrowserRuntime contract thay đổi trong các phase bên dưới.

### Acceptance criteria

```text
node scripts/check-version-sync.mjs
python scripts/check-docs.py
python scripts/check-source-duplicates.py
python scripts/build-sidecar.py
```

đều chạy được từ HEAD mới.

---

# 3. P0 — Bổ sung observability trước khi sửa browser

## P0-02 — Tauri đang bỏ toàn bộ stdout/stderr của backend sidecar

Hiện tại:

```rust
let (_rx, child) = app
    .shell()
    .sidecar("vidpool-backend")
    ...
    .spawn()?;
```

`_rx` bị bỏ.

Backend thực tế đã có các log quan trọng:

```text
browser_runtime_start
browser_open_start
Failed launching browser channel 'msedge'
Failed launching browser channel 'chrome'
browser_open_failed
browser_command_timeout
dreamina_probe_failed
```

Nhưng desktop không consume chúng.

### Hậu quả

Khi browser không mở, UI chỉ nhận lỗi tổng quát:

```text
Browser service unavailable
```

Không phân biệt được:

```text
Edge không tồn tại
Chrome không tồn tại
Playwright start fail
browser executable fail
profile bị lock
permission fail
page.goto timeout
Dreamina network fail
runtime timeout
runtime FAILED
```

### Implementation

Sửa:

```text
vidpool-frontend/src-tauri/src/backend.rs
```

Không được discard event receiver.

Tạo task đọc `CommandEvent` từ sidecar.

Cần xử lý ít nhất:

```text
Stdout
Stderr
Error
Terminated
```

Mục tiêu log:

```text
[backend:stdout] browser_runtime_start ...
[backend:stdout] browser_launch_attempt channel=msedge
[backend:stdout] browser_launch_success channel=msedge
[backend:stdout] browser_navigation_start provider=dreamina
[backend:stderr] browser_navigation_failed ...
```

### Security requirement

Không log:

```text
session token
Authorization header
cookie
localStorage secret
provider access token
full browser storage state
```

Có thể log:

```text
provider_key
profile_key
browser channel
operation name
elapsed_ms
error type
HTTP-safe status/code
```

### Tùy chọn tốt hơn

Nếu packaged app không có console dễ đọc, ghi sidecar logs vào app-local log directory.

Không cần đưa logging library lớn vào chỉ để fix bug này nếu một helper nhỏ là đủ.

### Tests

Rust unit test cho parser/forwarding helper nếu helper có logic.

Không cần test stdout framework internals của Tauri.

---

# 4. P0 — Tách Browser Launch khỏi Provider Navigation

## P0-03 — `open_login()` hiện coi browser launch và `page.goto()` là một operation duy nhất

Hiện tại:

```python
context = self._launch_persistent_context(profile_path)

pages = context.pages
page = pages[0] if pages else context.new_page()

page.goto(login_url, timeout=self._navigation_timeout_ms)
```

Toàn bộ nằm trong:

```python
try:
    ...
except Exception:
    if context is not None:
        context.close()
    raise
```

### Hậu quả

Flow hiện tại:

```text
Browser mở thành công
→ Dreamina điều hướng chậm / timeout / redirect lỗi
→ page.goto raise
→ context.close()
→ browser đóng
→ user thấy "không mở được browser"
```

Đối với interactive login, đây là semantics không đúng.

### Invariant mới

Phải tách:

```text
BROWSER LAUNCH
!=
PROVIDER NAVIGATION
```

Browser launch thành công phải tạo một active session trước.

Navigation tới provider là bước thứ hai.

### Desired flow

```text
resolve profile
→ launch Edge/Chrome
→ attach close listener
→ register _LiveSession
→ acquire/create page
→ navigate tới provider
```

Nếu navigation fail nhưng browser context vẫn còn sống:

```text
log warning
giữ browser mở
không xóa session
không close context
start_login vẫn có thể tiếp tục ở interactive mode
```

User có thể:

```text
retry navigation
hoặc
nhập URL trực tiếp trong browser
```

### Không được nuốt browser launch failure

Nếu:

```text
msedge launch fail
chrome launch fail
```

thì vẫn phải:

```text
raise BrowserUnavailable
không register active session
cleanup incomplete context
```

### Navigation strategy

Interactive login không cần chờ toàn bộ page load.

Ưu tiên:

```python
page.goto(
    login_url,
    wait_until="commit",
    timeout=...
)
```

hoặc một strategy tương đương có latency thấp.

Không dùng `networkidle` cho login page.

### Logging mới

Bổ sung structured events:

```text
browser_launch_attempt
browser_launch_success
browser_launch_failed

browser_navigation_start
browser_navigation_success
browser_navigation_failed

browser_session_registered
browser_session_closed
```

Không log raw cookie/token.

---

# 5. P0 — Không để outer command timeout poison runtime chỉ vì navigation chậm

Hiện:

```python
open_login()
→ _submit(...)
→ launch + navigation
```

và `_submit()` timeout sẽ:

```text
RuntimeState.FAILED
→ poison queue
```

Nếu Dreamina navigation bị treo đủ lâu, toàn bộ BrowserRuntime bị FAILED dù Edge có thể đã mở được.

### Fix

Đảm bảo:

```text
navigation timeout < outer open-login command timeout
```

và navigation timeout được catch bên trong operation.

Ví dụ concept:

```text
launch context
→ register session
→ navigation có timeout riêng
→ catch navigation timeout
→ log
→ operation return normally nếu context còn sống
```

Chỉ poison runtime nếu:

```text
owner command thật sự bị stuck
hoặc
Playwright owner thread mất khả năng phản hồi
```

Không poison runtime chỉ vì website provider chậm.

---

# 6. P0 — Browser channel detection phải rõ ràng

Hiện:

```python
DEFAULT_CHANNELS = ("msedge", "chrome")
```

Hướng này phù hợp desktop-first vì không cần ship Chromium riêng.

Giữ:

```text
1. Microsoft Edge
2. Google Chrome
```

### Cần bổ sung

Trong `_launch_persistent_context()`:

```text
browser_launch_attempt channel=msedge
browser_launch_success channel=msedge
```

Nếu Edge fail:

```text
browser_launch_failed channel=msedge error_type=...
browser_launch_attempt channel=chrome
```

Nếu tất cả fail:

```text
BrowserUnavailable
```

### Không thêm browser detection vào domain/application

Browser executable/channel là infrastructure concern.

---

# 7. P0 — Fix cleanup trong `AccountLoginService.start_login()`

Hiện:

```python
try:
    self._browser.open_login(...)
    persist account
except Exception:
    self._browser.close_profile(profile_key)
    try:
        self._browser.delete_profile(profile_key)
    except Exception:
        ...
    raise
```

## Vấn đề

`close_profile()` nằm ngoài cleanup guard.

Ví dụ:

```text
open_login timeout
→ BrowserRuntime chuyển FAILED
→ start_login catch exception
→ close_profile()
→ close_profile lại raise BrowserUnavailable vì runtime FAILED
→ exception cleanup che mất original exception
→ delete_profile không chạy
```

### Fix

Tạo helper rõ semantics:

```python
_cleanup_failed_login_start(profile_key)
```

Helper:

```text
best-effort close
best-effort delete
log từng cleanup failure riêng
không che original start_login exception
```

Concept:

```python
except Exception:
    self._cleanup_failed_login_start(profile_key)
    raise
```

### Quan trọng

Original exception phải được giữ nguyên.

Nếu root cause là:

```text
BrowserCommandTimeout
```

API/log phải thấy BrowserCommandTimeout, không bị thay bằng secondary cleanup error.

### Tests

Bắt buộc:

```text
open_login fails
→ original error preserved

open_login timeout/runtime FAILED
→ cleanup failure không mask original error

DB insert fails after browser opened
→ browser session closed
→ profile cleanup attempted

cleanup fails
→ cleanup error logged
→ original DB/browser error preserved
```

---

# 8. P0 — Fix callback khi user tự đóng browser

Hiện:

```python
context.on(
    "close",
    lambda: self._on_context_closed(profile_key),
)
```

Đổi sang callback tolerant với event args:

```python
lambda *_: self._on_context_closed(profile_key)
```

### Invariant

Khi user tự đóng cửa sổ browser:

```text
_sessions_by_profile
```

phải loại profile ngay.

Sau đó:

```text
has_open_session(profile_key) == False
```

### Regression test

FakeContext phải có khả năng gọi callback với argument:

```python
callback(context)
```

và verify session được cleanup.

---

# 9. P0 — Frontend đang coi mọi HTTP 409 là duplicate account

Trong:

```text
vidpool-frontend/src/features/account-login/ui/add-account-dialog.tsx
```

hiện:

```ts
const isDuplicate =
  (err instanceof ApiError &&
    (err.code === "ACCOUNT_ALREADY_EXISTS" || err.status === 409))
```

Đây là sai.

Backend dùng `409` cho nhiều trường hợp:

```text
SessionInvalid
BrowserProfileInUse
BrowserSessionNotOpen
InvalidAccountState
AccountInUse
DuplicateProviderIdentity
```

### Bug flow thực tế

```text
user mở browser
→ chưa login xong
→ bấm "Đã đăng nhập"
→ backend SessionInvalid
→ HTTP 409
→ frontend coi là Duplicate
→ set isTerminal=true
→ clear accountId
→ không cho retry đúng flow
```

Đây có thể trực tiếp làm login UX hỏng dù browser đã mở được.

### Fix

Duplicate chỉ khi:

```ts
err instanceof ApiError &&
err.code === "ACCOUNT_ALREADY_EXISTS"
```

Không dùng:

```ts
err.status === 409
```

để suy luận business error type.

### Backend error codes

Chuẩn hóa structured conflict errors.

Đề xuất:

```text
ACCOUNT_ALREADY_EXISTS
SESSION_INVALID
BROWSER_PROFILE_IN_USE
BROWSER_SESSION_NOT_OPEN
INVALID_ACCOUNT_STATE
ACCOUNT_IN_USE
```

Response:

```json
{
  "detail": {
    "code": "SESSION_INVALID",
    "message": "Browser session is not authenticated yet."
  }
}
```

Frontend đã có `ApiError.code`, nên tận dụng contract này.

### UI behavior

`SESSION_INVALID`:

```text
giữ accountId
isTerminal=false
hiển thị:
"Chưa phát hiện phiên đăng nhập. Hãy hoàn tất đăng nhập trong trình duyệt rồi thử lại."

actions:
- Mở lại trình duyệt
- Đã đăng nhập
- Hủy
```

`ACCOUNT_ALREADY_EXISTS`:

```text
terminal duplicate
backend cleanup provisional account
frontend clear pending account
cho phép add account khác
```

---

# 10. P1 — Tạo browser diagnostic smoke tests có ý nghĩa

## Existing smoke

Backend:

```text
--browser-smoke-test
```

hiện mở:

```text
about:blank
```

Test này chỉ xác minh:

```text
Playwright start
+
system Edge/Chrome launch
+
persistent context
```

Nó vẫn cần giữ.

Nhưng không được coi là Dreamina login E2E verification.

## Tách 3 tầng smoke test

### Level 1 — Browser launch smoke

Không cần internet.

```text
launch persistent context
→ about:blank
→ has_open_session == true
→ close
```

### Level 2 — Persistent profile smoke

Khôi phục/cập nhật:

```text
scripts/smoke-browser-profile.py
```

Test:

```text
Runtime A
→ local page
→ localStorage write
→ shutdown

Runtime B cùng profile
→ localStorage còn tồn tại

profile B
→ không thấy state profile A

delete profile A

Runtime C
→ state profile A đã mất
```

### Level 3 — Dreamina opt-in live smoke

Không chạy mặc định CI.

Guard:

```text
VIDPOOL_RUN_DREAMINA_LIVE_TESTS=1
```

Manual test:

```text
open interactive Dreamina login browser
→ user login
→ inspect authentication
→ resolve identity
→ close
→ validate persisted session
```

Không lưu credentials trong repo.

---

# 11. P1 — Real browser login manual verification gate

Sau khi P0 code xong, bắt buộc test trên Windows thật.

## Test A — Edge installed

Expected:

```text
Click Add Account
→ Dreamina selected
→ Edge window xuất hiện
→ profile riêng
→ Dreamina URL mở
```

Log expected:

```text
browser_launch_attempt channel=msedge
browser_launch_success channel=msedge
browser_session_registered
browser_navigation_start
```

## Test B — Navigation failure simulation

Dùng test URL unreachable hoặc launcher fake.

Expected:

```text
browser vẫn mở
runtime vẫn RUNNING
session vẫn registered
navigation warning
```

Không được:

```text
context.close()
RuntimeState.FAILED
```

chỉ vì website navigation fail bình thường.

## Test C — User closes browser manually

Expected:

```text
session removed
has_open_session == false
```

## Test D — Chrome fallback

Simulate Edge launch failure.

Expected:

```text
msedge fail
→ chrome attempt
→ chrome success
```

## Test E — no supported browser

Expected:

```text
HTTP 503
UI báo rõ browser service unavailable
backend log có channel attempts
không tạo account DB rác
```

---

# 12. P1 — Dreamina login completion

Khi browser mở ổn, verify tiếp flow:

```text
start login
→ login Dreamina
→ complete login
→ validate_active_session
→ resolve_identity
→ persist external_identity/display_name
```

Files:

```text
vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_adapter.py
vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_probe.py
vidpool-backend/app/modules/accounts/application/login_service.py
```

### Không hard-code thêm selectors nếu chưa có evidence

Dreamina DOM có thể thay đổi.

Nếu probe fail:

```text
capture sanitized diagnostics
→ inspect actual DOM
→ update probe based on evidence
```

Không random thêm selector cho đến khi test trên site thật.

### Auth state invariant

Không được mark ACTIVE nếu:

```text
authenticated == false
```

Không được persist account identity nếu:

```text
external_identity is None
```

---

# 13. P1 — Relogin identity integrity

Sau khi basic login hoạt động, sửa finding này trước khi triển khai provider jobs.

## Problem

Account B có thể relogin nhưng user đăng nhập nhầm account A.

Backend phát hiện duplicate identity và giữ DB Account B.

Nhưng persistent browser profile B có thể đã chứa session của Account A.

Sau đó:

```text
DB:
Account B → external_identity=B

browser profile:
Account B profile → actually logged into A
```

`validate_persisted_session()` hiện chỉ trả:

```text
authenticated: bool
```

không xác minh profile thuộc identity nào.

## Required invariant

```text
registered external_identity
==
persisted browser session external_identity
```

### Hướng thiết kế

Không biến core thành Dreamina-specific.

Mở rộng provider auth contract theo hướng validation có identity hoặc có method riêng:

```text
inspect_persisted_identity(profile_key)
```

hoặc một value object:

```text
PersistedSessionInspection
- valid
- external_identity
- display_name
```

Application service so sánh identity với account đã đăng ký.

### Duplicate relogin

Nếu relogin B thành A:

```text
reject
keep DB B
purge/restore invalid profile strategy rõ ràng
status = AUTH_REQUIRED
```

Không được để profile B tiếp tục được coi là valid.

---

# 14. P1 — Graceful Tauri → backend shutdown

Hiện:

```rust
child.kill()
```

trong:

```text
vidpool-frontend/src-tauri/src/state.rs
```

không đảm bảo:

```text
FastAPI lifespan
→ AppContainer.close()
→ BrowserRuntime.close_all()
```

được chạy.

### Desired shutdown

```text
Tauri ExitRequested
→ request graceful backend shutdown
→ backend closes BrowserRuntime
→ closes BrowserContext
→ Playwright stop
→ process exits
→ nếu quá timeout mới force child.kill()
```

### Có thể triển khai

Ưu tiên một explicit local shutdown endpoint được bảo vệ bởi Bearer session token:

```text
POST /api/session/shutdown
```

hoặc signal/process strategy phù hợp Windows.

Endpoint chỉ bind localhost và bắt buộc session token.

### Không expose unauthenticated shutdown API

---

# 15. P2 — Availability semantics sau khi login foundation ổn định

Không chặn browser-login milestone, nhưng nên fix trước durable job scheduling.

Hiện frontend có:

```ts
const readyCount =
  availableCount > 0 || totalCount === 0
    ? availableCount
    : activeCount
```

Nếu tất cả ACTIVE account đang leased:

```text
availableCount = 0
activeCount > 0
```

UI vẫn báo chúng ready.

### Fix

```text
Ready / Available = isAvailable
Active = authentication/account state
In use = isLeased
```

Không fallback từ `isAvailable` về `status === active`.

### AccountPoolSummary

Không label toàn bộ ACTIVE thành:

```text
Sẵn sàng
Ready
```

Tách:

```text
Available
In use
Auth required
Cooldown
Disabled
```

hoặc nếu vẫn muốn hiển thị Active, phải gọi đúng là:

```text
Active
```

không phải Ready.

---

# 16. Error contract đề xuất

Không leak infrastructure detail ra UI nhưng vẫn đủ để xử lý state machine.

## Browser launch fail

HTTP:

```text
503
```

code:

```text
BROWSER_UNAVAILABLE
```

message:

```text
Không thể mở trình duyệt đăng nhập.
```

Backend logs giữ root error.

## Navigation warning

Nếu browser vẫn sống:

```text
start login vẫn thành công
```

Không nhất thiết trả failure.

Có thể sau này thêm:

```text
navigationStatus
```

nhưng không cần trong batch đầu nếu chưa có UX sử dụng.

## Session not logged in

HTTP:

```text
409
```

code:

```text
SESSION_INVALID
```

non-terminal.

## Duplicate

HTTP:

```text
409
```

code:

```text
ACCOUNT_ALREADY_EXISTS
```

terminal cho provisional login.

---

# 17. Test plan chi tiết

## Backend unit

### BrowserRuntime

Bổ sung:

```text
test_launch_success_registers_session_before_navigation
test_navigation_failure_keeps_browser_session_open
test_navigation_failure_does_not_fail_runtime
test_launch_failure_does_not_register_session
test_edge_failure_falls_back_to_chrome
test_all_channels_failure_raises_browser_unavailable
test_close_callback_accepts_event_argument
test_manual_context_close_removes_session
```

### AccountLoginService

Bổ sung:

```text
test_start_login_preserves_original_browser_error_when_cleanup_fails
test_start_login_db_failure_closes_open_profile
test_start_login_db_failure_attempts_profile_cleanup
test_start_login_cleanup_failure_does_not_mask_original_error
```

### API

Bổ sung:

```text
test_session_invalid_returns_structured_session_invalid_code
test_duplicate_returns_account_already_exists_code
test_browser_unavailable_returns_sanitized_code_and_message
```

---

## Frontend

`AddAccountDialog`:

```text
SESSION_INVALID 409
→ NOT duplicate
→ accountId preserved
→ retry possible

ACCOUNT_ALREADY_EXISTS 409
→ terminal duplicate
→ accountId cleared

generic 409 without duplicate code
→ NOT duplicate

BROWSER_UNAVAILABLE 503
→ displays recoverable browser message
```

---

## Rust/Tauri

```text
sidecar event receiver is consumed
backend stderr/stdout forwarding helper works
authenticated readiness probe still works
shutdown fallback remains bounded
```

---

# 18. Verification commands

## Backend

```bash
cd vidpool-backend

ruff check .
pyright
pytest -q
alembic upgrade head
alembic current
```

## Repository scripts

```bash
python scripts/check-docs.py
python scripts/check-source-duplicates.py
node scripts/check-version-sync.mjs
```

## Frontend

```bash
cd vidpool-frontend

pnpm check
pnpm knip
pnpm build
```

## Rust

```bash
cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

## Sidecar

```bash
python scripts/build-sidecar.py
```

Sau đó:

```powershell
.\vidpool-frontend\src-tauri\binaries\vidpool-backend-x86_64-pc-windows-msvc.exe --browser-smoke-test
```

## Persistent browser profile smoke

```bash
python scripts/smoke-browser-profile.py
```

## Desktop build

```bash
cd vidpool-frontend
pnpm tauri build
```

---

# 19. Manual acceptance test — bắt buộc

Automated tests không đủ cho browser login.

Trên Windows:

```text
1. Khởi động VidPool Desktop.
2. Mở Account Pool.
3. Bấm Thêm tài khoản mới.
4. Chọn Dreamina.
5. Bấm Tiếp tục đăng nhập.
6. Xác nhận Edge hoặc Chrome thực sự mở.
7. Xác nhận browser đi tới Dreamina.
8. Đăng nhập tài khoản thật.
9. Quay lại VidPool.
10. Bấm Đã đăng nhập.
11. Xác nhận account xuất hiện trong pool.
12. Xác nhận display name / identity đúng.
13. Đóng VidPool.
14. Mở lại.
15. Validate account.
16. Xác nhận session vẫn tồn tại.
```

### Pass criteria

```text
browser không tự đóng do navigation timeout
không cần API key
không cần user setup Gmail/API
không cần copy cookie thủ công
profile của account được isolate
session tồn tại sau restart
frontend không nhầm SessionInvalid thành Duplicate
```

---

# 20. Thứ tự triển khai

Bắt buộc theo thứ tự:

```text
1. Restore CI/build scripts
2. Run baseline CI/tooling
3. Add sidecar/browser diagnostics
4. Add failing browser-navigation regression tests
5. Decouple launch from navigation
6. Fix runtime timeout semantics
7. Fix close callback
8. Fix AccountLoginService cleanup masking
9. Standardize backend login error codes
10. Fix frontend 409/duplicate state machine
11. Run browser launch smoke
12. Run persistent-profile smoke
13. Run real Dreamina browser login manually
14. Fix Dreamina probe only if real evidence requires it
15. Verify restart persistence
16. Fix relogin identity integrity
17. Implement graceful desktop shutdown
18. Fix availability semantics
19. Run full verification gates
20. Update CURRENT_STATUS.md with exact verified SHA
```

Không bắt đầu provider execution/durable jobs trước bước 16.

---

# 21. Files dự kiến thay đổi

## Backend

```text
vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py
vidpool-backend/app/modules/accounts/application/login_service.py
vidpool-backend/app/modules/accounts/api/router.py
vidpool-backend/app/modules/accounts/domain/errors.py
vidpool-backend/app/modules/accounts/application/ports.py
vidpool-backend/app/modules/accounts/application/health_service.py
vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_adapter.py

vidpool-backend/tests/accounts/test_browser_runtime.py
vidpool-backend/tests/accounts/test_account_service.py
vidpool-backend/tests/accounts/test_accounts_api.py
vidpool-backend/tests/accounts/test_dreamina_live.py
```

Không phải file nào cũng bắt buộc sửa; chỉ sửa nếu implementation cần.

## Frontend

```text
vidpool-frontend/src/features/account-login/ui/add-account-dialog.tsx
vidpool-frontend/src/features/account-login/ui/add-account-dialog.test.tsx
vidpool-frontend/src/pages/accounts/ui/accounts-page.tsx
vidpool-frontend/src/widgets/account-pool-summary/ui/account-pool-summary.tsx
```

## Tauri

```text
vidpool-frontend/src-tauri/src/backend.rs
vidpool-frontend/src-tauri/src/state.rs
vidpool-frontend/src-tauri/src/lib.rs
```

## Tooling

```text
scripts/build-sidecar.py
scripts/check-docs.py
scripts/check-source-duplicates.py
scripts/check-version-sync.mjs
scripts/smoke-browser-profile.py
```

## Docs

```text
docs/CURRENT_STATUS.md
docs/adr/0018-single-owner-playwright-browser-runtime.md
```

ADR chỉ cập nhật nếu behavior mới vẫn nằm trong accepted single-owner design.

Nếu thay đổi architectural decision thực sự, tạo ADR mới thay vì sửa lịch sử decision.

---

# 22. Architecture constraints

Giữ nguyên:

```text
Backend:
Domain
  ↓
Application
  ↓
Ports
  ↓
Infrastructure

Frontend:
app
pages
widgets
features
entities
shared
```

### Không được làm

Không:

```text
import Playwright vào application/domain
đưa Dreamina selector vào AccountService
đưa browser process logic vào React
tạo duplicate browser manager
bypass BrowserRuntime owner thread
call subprocess browser trực tiếp từ API route
hard-code Windows Edge executable path trong core
```

Provider-specific behavior phải ở:

```text
infrastructure/providers/<provider>
```

Browser lifecycle chung phải ở:

```text
infrastructure/browser
```

---

# 23. Definition of Done

Account Pool browser-login batch chỉ DONE khi tất cả điều sau đúng:

- [ ] HEAD không còn CI reference tới file đã bị xóa.
- [ ] Sidecar build script hoạt động.
- [ ] Browser smoke test pass.
- [ ] Persistent-profile smoke test pass.
- [ ] Tauri nhận/forward được backend diagnostics.
- [ ] Có log xác định browser channel launch.
- [ ] Edge launch thành công trên Windows test machine.
- [ ] Chrome fallback được regression-test.
- [ ] Navigation failure không tự đóng browser.
- [ ] Navigation failure bình thường không poison BrowserRuntime.
- [ ] User tự đóng browser cleanup session map đúng.
- [ ] `start_login` cleanup không mask original exception.
- [ ] Frontend không coi mọi HTTP 409 là duplicate.
- [ ] `SESSION_INVALID` cho phép retry.
- [ ] `ACCOUNT_ALREADY_EXISTS` xử lý terminal đúng.
- [ ] Dreamina interactive login mở được.
- [ ] Dreamina authenticated state detect được.
- [ ] Dreamina identity resolve đúng.
- [ ] Account được persist.
- [ ] Restart app vẫn dùng được persisted session.
- [ ] Relogin không thể làm DB identity và browser identity lệch nhau.
- [ ] Desktop shutdown có graceful path trước force kill.
- [ ] `isAvailable` không fallback sai về ACTIVE.
- [ ] Ruff pass.
- [ ] Pyright pass.
- [ ] Backend pytest pass.
- [ ] Alembic pass.
- [ ] Frontend `pnpm check` pass.
- [ ] Frontend `pnpm knip` pass.
- [ ] Rust tests/check pass.
- [ ] Sidecar build pass.
- [ ] Tauri production build pass.
- [ ] `docs/CURRENT_STATUS.md` chỉ claim exact commit đã thực sự verify.

---

# 24. Completion milestone trước khi làm feature tiếp theo

Chỉ chuyển sang durable jobs / provider execution khi flow sau chạy ổn:

```text
ACCOUNT POOL FOUNDATION

Provider registry
       ↓
Add account
       ↓
Open isolated browser
       ↓
Interactive login
       ↓
Validate session
       ↓
Resolve identity
       ↓
Persist account/profile mapping
       ↓
Restart-safe session
       ↓
Relogin-safe identity
       ↓
Lease-ready account
```

Nếu chưa qua milestone này, không nên triển khai Seedance job execution vì mọi job phía sau đều phụ thuộc Account Pool đáng tin cậy.
