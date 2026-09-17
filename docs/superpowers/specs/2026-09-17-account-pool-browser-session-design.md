# VidPool Account Pool + Browser Session Design

**Date:** 2026-09-17  
**Status:** Approved design baseline  
**Scope:** Account Pool core + browser-session login infrastructure for Windows-first VidPool

## 1. Goal

Cho phép người dùng thêm và giữ nhiều account provider theo UX:

```text
Add Account
   -> chọn provider
   -> VidPool mở browser profile riêng
   -> user tự login bằng Google/email/2FA/captcha như bình thường
   -> user bấm "Đã đăng nhập"
   -> VidPool validate session
   -> account ACTIVE
   -> lần sau mở app dùng lại session, không setup API key/cookie thủ công
```

Account Pool là dependency nền cho các provider adapter sau này, nhưng không phụ thuộc Project hoặc Durable Job ở giai đoạn đầu.

## 2. Non-goals

Không làm trong feature này:

- tự tạo Gmail/account provider;
- lưu password Gmail/provider;
- tự điền password/2FA;
- bypass CAPTCHA;
- đọc/copy cookie từ Chrome profile cá nhân của user;
- tự động chuyển account khi provider báo quota/rate-limit nhằm né giới hạn;
- account farming/free-credit rotation;
- distributed pool, Redis, Celery, microservice;
- provider-specific generation logic;
- Story/Project/TTS/Image/Video pipeline.

Chỉ dùng account/credential mà user được phép sử dụng và tuân thủ giới hạn của provider.

## 3. Core architecture

```text
React Account UI
        |
        v
Protected FastAPI API
        |
        v
Account Application Layer
  |           |             |
  v           v             v
AccountRepo  AccountPool   ProviderAuthPort
  |             |               |
  v             |               v
SQLite          |         Provider Auth Adapter
                |               |
                v               v
           AccountLease   BrowserSessionManager
                                |
                                v
                     Playwright persistent context
                                |
                                v
                   Edge/Chrome + isolated profile
```

Dependency direction remains:

```text
API -> Application -> Domain
Application -> Ports
Infrastructure -> Ports
```

Domain/application must not import Playwright, SQLAlchemy, FastAPI, Tauri, provider SDKs, or OS APIs.

## 4. Browser runtime choice

Primary runtime:

```text
Playwright Python
+ launch_persistent_context(...)
+ channel="msedge"
+ dedicated user_data_dir per account
```

Fallback:

```text
channel="chrome"
```

No Playwright-downloaded Chromium is required in the first implementation. VidPool is currently Windows-first, so Microsoft Edge is the zero-setup default browser target.

If neither Edge nor Chrome can be launched, return a normalized `BrowserUnavailable` application error and show a clear UI message.

Persistent browser profile is chosen instead of exported cookie blobs because it preserves:

- cookies;
- localStorage;
- IndexedDB;
- provider/browser session state.

VidPool never reads or stores Gmail password.

## 5. Account model

```text
ProviderAccount
- id: UUID
- provider_key: str
- display_name: str | None
- external_identity: str | None
- status: AccountStatus
- profile_key: str
- last_used_at: datetime | None
- last_validated_at: datetime | None
- last_success_at: datetime | None
- last_failure_at: datetime | None
- consecutive_failures: int
- cooldown_until: datetime | None
- created_at: datetime
- updated_at: datetime
```

`profile_key` is an opaque identifier such as:

```text
browser-profile/{provider_key}/{account_id}
```

Do not persist absolute machine-specific paths in the domain.

## 6. Account states

```text
AUTH_REQUIRED
ACTIVE
COOLDOWN
DISABLED
```

Rules:

```text
new account -> AUTH_REQUIRED
validated login -> ACTIVE
invalid/expired session -> AUTH_REQUIRED
temporary provider failure eligible for cooldown -> COOLDOWN
cooldown elapsed -> logically eligible to return ACTIVE
user disable -> DISABLED
```

`BUSY` is deliberately not an account state. Availability is derived from account state plus presence of an unexpired lease.

## 7. Browser profile storage

Resolve paths in infrastructure:

```text
VIDPOOL_DATA_DIR override
or ~/.vidpool

<vidpool-data>/
  browser-profiles/
    <provider_key>/
      <account_id>/
```

Each account has exactly one persistent browser profile directory.

Profile security rules:

- never expose profile path to React;
- never serve profile files over FastAPI;
- never log cookies/tokens/storage state;
- delete profile directory when account is permanently deleted;
- reject provider/account path segments that are not generated internally;
- never reuse the user's normal Edge/Chrome profile.

## 8. Provider auth port

Application-owned port:

```python
class ProviderAuthPort(Protocol):
    provider_key: str

    def login_url(self) -> str: ...
    def validate_session(self, profile: BrowserProfileHandle) -> SessionValidation: ...
    def resolve_identity(self, profile: BrowserProfileHandle) -> ProviderIdentity: ...
    def logout(self, profile: BrowserProfileHandle) -> None: ...
```

Provider-specific selectors, URLs, page structure, cookies, account identity parsing, and login-state detection live only inside infrastructure provider adapters.

Account Pool does not know:

```text
Google SID
provider cookie names
DOM selectors
remote account IDs
provider login route structure
```

## 9. BrowserSessionManager port

Application-facing port:

```python
class BrowserSessionPort(Protocol):
    def open_login(self, provider_key: str, profile_key: str, login_url: str) -> BrowserSessionId: ...
    def get_profile(self, profile_key: str) -> BrowserProfileHandle: ...
    def close(self, session_id: BrowserSessionId) -> None: ...
    def delete_profile(self, profile_key: str) -> None: ...
```

Infrastructure implementation owns Playwright.

Only one live browser context may use a given profile at a time.

## 10. Login flow

```text
POST login/start
   |
   v
create ProviderAccount(AUTH_REQUIRED)
   |
   v
allocate profile_key
   |
   v
BrowserSessionManager.open_login(...)
   |
   v
Edge opens login page
   |
   v
user logs in manually
   |
   v
user returns to VidPool and clicks "Đã đăng nhập"
   |
   v
POST login/complete
   |
   v
ProviderAuthPort.validate_session(profile)
   |
   +-- invalid -> keep AUTH_REQUIRED
   |
   +-- valid
         |
         v
ProviderAuthPort.resolve_identity(profile)
         |
         v
save identity + ACTIVE
         |
         v
close browser context
```

The flow is intentionally user-confirmed rather than generic DOM auto-detection, because login success criteria are provider-specific and brittle.

## 11. Relogin flow

```text
ACTIVE account
   -> session later invalid
   -> mark AUTH_REQUIRED
   -> UI shows "Đăng nhập lại"
   -> open same persistent profile
   -> user logs in
   -> validate
   -> ACTIVE
```

Re-login reuses the same profile and same account ID.

## 12. Account lease model

```text
AccountLease
- id: UUID
- account_id: UUID
- owner_id: str
- acquired_at: datetime
- expires_at: datetime
```

MVP owner:

```text
request:<uuid>
```

Future Durable Job migration:

```text
job:<job_id>
```

No schema redesign is required.

Rules:

- at most one unexpired lease per account;
- expired lease does not make account unavailable;
- release deletes the lease;
- acquiring updates `last_used_at`;
- disabling/deleting an account with active lease must fail with conflict unless the lease has expired.

## 13. Selection policy

MVP selection policy: LRU.

Eligibility:

```text
status == ACTIVE
AND cooldown_until is null or <= now
AND no unexpired lease
```

Ordering:

```text
last_used_at NULL first
then last_used_at ascending
then created_at ascending
```

No weighted scheduling in MVP.

## 14. Quota/rate-limit behavior

Provider error normalization is separate from credential scheduling.

If a provider reports a quota or rate-limit error:

```text
adapter -> normalized ProviderRateLimited
account pool may record cooldown metadata
current operation fails
```

The caller must not silently reacquire another account solely to bypass that provider restriction.

## 15. Persistence

SQLite stores metadata only:

```text
provider_accounts
account_leases
```

Browser session state remains in the dedicated browser profile directory managed by Chromium/Edge.

SQLAlchemy models are persistence representations, not domain entities.

## 16. API surface

Protected local API only.

```http
GET    /api/providers
GET    /api/accounts
GET    /api/accounts/{account_id}

POST   /api/providers/{provider_key}/accounts/login/start
POST   /api/accounts/{account_id}/login/complete
POST   /api/accounts/{account_id}/login/cancel
POST   /api/accounts/{account_id}/relogin/start

POST   /api/accounts/{account_id}/validate
POST   /api/accounts/{account_id}/enable
POST   /api/accounts/{account_id}/disable
DELETE /api/accounts/{account_id}
```

Internal application methods such as `acquire()` and `release()` are not exposed to React.

## 17. Frontend UX

Main screen:

```text
Accounts                                      [+ Add account]

Provider X
------------------------------------------------------------
user1@example.com          ACTIVE
Last checked: 2m ago                         [Manage]

user2@example.com          LOGIN REQUIRED
                                             [Login again]

user3@example.com          COOLDOWN
Available after 14:35                       [Manage]
```

Add flow:

```text
+ Add account
   -> choose provider
   -> "Login" button
   -> browser opens
   -> user logs in
   -> back to VidPool
   -> "Đã đăng nhập"
   -> validation
   -> account appears ACTIVE
```

User never sees cookie/session/profile-path details.

## 18. Provider registry

Provider registry exposes metadata only:

```text
provider_key
display_name
auth_kind = BROWSER_SESSION
capabilities
```

Only providers that have a production auth adapter registered should be shown as addable.

Tests may use a fake provider adapter.

## 19. Browser lifecycle

Runtime holds an in-memory registry:

```text
profile_key -> live BrowserContext/session
```

Rules:

- one live context/profile;
- login cancellation closes context;
- backend shutdown closes all managed contexts;
- profile data remains on disk;
- app restart may reopen existing account profiles;
- stale in-memory session IDs are not persisted.

## 20. Error model

Normalize at application boundary:

```text
ProviderNotRegistered
BrowserUnavailable
AccountNotFound
AccountDisabled
AccountInUse
LoginSessionNotOpen
SessionInvalid
NoEligibleAccount
LeaseNotFound
LeaseExpired
```

API maps these to stable HTTP responses, e.g.:

```text
404 provider/account/lease not found
409 account in use / invalid state transition
422 invalid request
503 browser unavailable
```

Do not return Playwright exception text directly to frontend.

## 21. Testing strategy

Domain tests:

- state transitions;
- LRU eligibility;
- expired cooldown behavior.

Application tests with fakes:

- start login;
- complete login success/failure;
- relogin;
- disable/enable;
- delete profile;
- acquire/release lease;
- expired lease recovery;
- no quota-triggered automatic failover.

Persistence tests:

- SQLAlchemy mapping;
- migration upgrade/downgrade;
- unique lease race behavior.

Browser infrastructure tests:

- path isolation;
- one context per profile;
- close/delete behavior;
- browser-unavailable normalization.

API tests:

- all routes require app session;
- schemas never expose profile path or secret/session data.

Frontend tests:

- add-account flow;
- login-required state;
- relogin;
- disabled/cooldown rendering.

Packaged smoke test:

- PyInstaller sidecar starts;
- Playwright driver imports/runs;
- Edge channel can launch a persistent context on Windows development machine.

## 22. Deployment/package constraints

Add `playwright` to Python dependencies.

Do not require `playwright install chromium` for the first implementation; use installed Microsoft Edge channel on Windows and Chrome as fallback.

PyInstaller build must include Playwright runtime/driver files required by the Python package.

CI may verify import/build, while the interactive browser launch remains a Windows manual/package smoke test unless a stable CI browser strategy is later added.

## 23. Future integration

Durable Job Engine later calls:

```python
lease = account_pool.acquire(
    provider_key=provider_key,
    owner_id=f"job:{job_id}",
    ttl=...,
)
```

Then Provider Adapter uses:

```text
lease.account.profile_key
  -> BrowserSessionPort
  -> provider browser automation
```

Project ID is not part of Account Pool.

## 24. Definition of design success

The design is successful if:

- adding an account requires no API key/cookie copy;
- login is manual in a dedicated browser profile;
- session survives VidPool restart;
- account metadata is persisted separately from browser session state;
- multiple accounts cannot share a browser profile;
- an account cannot be concurrently leased twice;
- domain/application remain independent from Playwright/SQLAlchemy/FastAPI;
- provider-specific login logic stays in provider adapters;
- no credentials or session state are exposed to React/logs;
- future Job Engine can reuse the pool without schema redesign.
