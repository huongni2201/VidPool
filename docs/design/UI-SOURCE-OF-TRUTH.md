# VidPool UI Specification & Source of Truth

**Status:** Canonical UI Design Baseline  
**Prototype Reference:** [`docs/design/desktop-ui-prototype.html`](file:///d:/workspace/VidPool/docs/design/desktop-ui-prototype.html)  
**Live Preview (Vite):** [`http://localhost:5173/prototype.html`](http://localhost:5173/prototype.html) / [`vidpool-frontend/public/prototype.html`](file:///d:/workspace/VidPool/vidpool-frontend/public/prototype.html)

---

## Implementation Semantics

This document is the canonical **target UI/interaction design**, not proof that the corresponding backend capability already exists.

Implementation reality is defined only by:

- `docs/CURRENT_STATUS.md`
- production source code
- passing tests

Rules for implementation agents:

1. A screen, metric, button, state, provider, or workflow shown here may be prototype-only.
2. Never create backend behavior solely because the prototype displays it.
3. Before wiring a UI control, verify the capability exists in `CURRENT_STATUS.md`.
4. Mock quota/stamina/credits values are visual examples until a production provider execution/quota contract exists.
5. Provider credentials must not be rotated to bypass provider quotas, rate limits, or platform restrictions.

---

## 1. Mục Đích & Nguyên Tắc Cốt Lõi

Tài liệu này và file prototype HTML đi kèm là **Source of Truth** cho toàn bộ giao diện desktop app VidPool (Tauri v2 + React 19 + Tailwind CSS v4 + Base UI/shadcn).

### Các nguyên tắc giao diện bất di bất dịch:
1. **Desktop-First & Studio-Grade Ergonomics**: VidPool là phần mềm sáng tạo chuyên nghiệp (tương tự Linear, DaVinci Resolve, Runway Gen-3, Cursor), không phải một dashboard web phổ thông. Giao diện ưu tiên mật độ thông tin cao, thao tác nhanh, phản hồi thời gian thực và hạn chế tối đa modal che khuất workflow.
2. **Local-First & Offline Resilience**: Giao diện không phụ thuộc vào CDN bên ngoài. Icon, font chữ và styling đều đóng gói nội bộ.
3. **Data States Clarity**: Phân định trực quan rõ ràng giữa các trạng thái dữ liệu:
   - **Candidate** (gợi ý từ AI, chưa duyệt)
   - **Approved** (user đã chọn sử dụng)
   - **Locked** (đã khóa, cấm ghi đè tự động khi regenerate)
   - **Stale / Invalidated** (cần cập nhật do phụ thuộc phía trước thay đổi)
   - **Failed** (lỗi thực thi, hiển thị nguyên nhân và nút Retry)
4. **Clean Boundary Compliance**: React UI chỉ gọi các API cục bộ được bảo vệ của FastAPI Sidecar qua token per-session. Không bao giờ gọi trực tiếp external AI providers hoặc truy cập trực tiếp SQLite.

---

## 2. Design Tokens System (Tailwind CSS v4 & OKLCH)

### 2.1 Bảng Màu Cốt Lõi (Dark Mode Studio Palette)

```css
:root {
  /* Canvas & Nền */
  --canvas: #07090e;         /* Nền tổng thể siêu tối */
  --surface-1: #0c1017;      /* Sidebar, Navigation & Panels chính */
  --surface-2: #121824;      /* Cards, Inputs, Table rows */
  --surface-3: #182132;      /* Hover states, active items */
  --surface-4: #202b40;      /* Elevated dropdowns, popovers */

  /* Đường viền & Phân cách */
  --line: rgba(255, 255, 255, 0.08);
  --line-subtle: rgba(255, 255, 255, 0.04);
  --line-strong: rgba(255, 255, 255, 0.16);

  /* Văn bản & Typography */
  --text: #f3f6fc;           /* Tiêu đề & nội dung chính */
  --text-sub: #9ca8bc;       /* Mô tả phụ, labels */
  --text-muted: #64748b;     /* Timestamps, disabled hints */

  /* Brand Accent */
  --accent: #6366f1;         /* Electric Violet Primary */
  --accent-light: #818cf8;
  --accent-dark: #4f46e5;
  --accent-soft: rgba(99, 102, 241, 0.12);

  /* Semantic Status */
  --emerald: #10b981;        /* Active / Success / Healthy */
  --emerald-soft: rgba(16, 185, 129, 0.14);
  --amber: #f59e0b;          /* Low Quota / Warning / Needs Login */
  --amber-soft: rgba(245, 158, 11, 0.14);
  --rose: #f43f5e;           /* Quota Exhausted / Job Failed */
  --rose-soft: rgba(244, 63, 94, 0.14);
}
```

---

## 3. Kiến Trúc Màn Hình & Phân Rã Tính Năng

### 3.1 Khung Vỏ Tổng Thể (App Shell)
- **Left Sidebar**: 
  - Logo studio với nhãn phiên bản động `v0.1.0` (đồng bộ từ Tauri `getVersion()`).
  - Điều hướng chính trong Launcher mode: Dự án của tôi (`/`), Tài khoản AI (`/accounts`), Cài đặt (`/settings`).
  - Điều hướng trong Workspace mode: Nút quay lại Màn hình dự án, Chỉnh sửa (`/editor`), Chapter (`/chapters`), Visual Beat (`/visual-beat`), Nhân vật (`/characters`), Voice (`/voice`), Hàng đợi & Render (`/jobs`).
  - Widget trạng thái Runtime góc dưới: Trạng thái kết nối FastAPI Sidecar (runtime-selected loopback port; browser development defaults to 8000), nhãn phiên bản app `v0.1.0`.
- **Top Studio Bar**:
  - Breadcrumb và bộ hiển thị thông tin dự án hiện hành.
  - Runtime indicators.

---

### 3.2 Màn Hình 1: Dashboard (`#screen-home`)
- **Mục đích**: Tổng quan toàn studio, truy cập nhanh các dự án gần đây và theo dõi sức khỏe runtime.
- **Thành phần**:
  - 4 thẻ KPI: Tổng số dự án hoạt động, Tình trạng Account Pool (Số account ready / Tổng account, tổng Stamina, tổng Credits), Số Durable Jobs đang xử lý, Cảnh báo cần chú ý.
  - Thẻ dự án gần đây kèm thumbnail, tiến độ phần trăm và nút "Open Workspace".
  - Luồng sự kiện sản xuất thời gian thực (Production Activity Stream).

---

### 3.3 Màn Hình 2: Account Pool & Quota Health (`#screen-accounts`)
- **Mục đích**: Trung tâm quản trị tài khoản provider (Dreamina / Seedance), luân phiên tài khoản theo cơ chế LRU Leasing và theo dõi sức khỏe tài khoản.

> [!NOTE]
> Dreamina is the currently wired browser-auth provider. Other provider tiles shown in prototypes are mock/future examples unless listed in `CURRENT_STATUS.md`.
> VidPool keeps authentication state inside an isolated persistent browser profile managed locally by Playwright. The application does not store the provider password or expose browser-session secrets through the API/UI.

**Currently implemented account interactions:**

- backend-discovered provider list;
- Dreamina browser-session account registration;
- isolated persistent browser profiles;
- account states: `AUTH_REQUIRED`, `ACTIVE`, `COOLDOWN`, `DISABLED`;
- Add Account;
- Re-login;
- Validate;
- Enable/Disable;
- Delete;
- durable LRU account lease infrastructure.

**Prototype-only / future provider-health visualization:**

- stamina;
- credits;
- provider quota percentage;
- quota reset countdown;
- exhausted-quota counters;
- refresh-all quota snapshots;
- provider execution job assignment.

These elements are mock UI until provider execution/quota contracts are implemented.

- **Thành phần trong Prototype**:
  - **Dải chỉ số 5 ô (Mock / Future Health Metrics)**: Ready Accounts, Total Stamina (điểm miễn phí), Usable Credits (điểm trả phí fallback), Quota Exhausted (tài khoản cạn tài nguyên), Login Required (phiên hết hạn).
  - **Thanh tóm tắt sức khỏe Provider (Mock UI)**: Hiển thị phân bổ tài khoản theo 4 mức: Full (100%), Available (>35%), Low (<35%), Exhausted (0%).
  - **Thanh lọc và tìm kiếm**: Lọc theo Provider, Quota Health, Account Status, và Search input tìm kiếm theo email.
  - **Bảng dữ liệu tài khoản chuyên sâu**:
    - **Account Identity**: Avatar nhà cung cấp, Email / Display Name, Thẻ trạng thái và vai trò.
    - **Trạng thái session**: `ACTIVE` (Emerald), `IN LEASE` (Indigo), `EXHAUSTED` (Rose - prototype), `LOGIN REQUIRED` (Amber), `DISABLED` (Slate).
    - **Thước đo Stamina (Prototype / Mock)**: Thanh đo trực quan (0–130 điểm) đổi màu theo ngưỡng năng lượng, nhãn % dung lượng và số lượng cụ thể.
    - **Số dư Credits (Prototype / Mock)**: Số dư fallback có phí.
    - **Bộ đếm thời gian Reset (Prototype / Mock)**: Đếm ngược thời gian hồi phục hạn ngạch hàng ngày (Daily Reset Countdown: e.g. `07h 32m`).
    - **Sức khỏe phiên**: Thời điểm kiểm tra gần nhất và tình trạng browser profile session.
    - **Hành động**: Làm mới quota từng tài khoản, xem tùy chọn, kích hoạt lại session đăng nhập.
  - **Hành động trên đầu trang**: Nút "Refresh All Quotas" (animation mô phỏng đồng bộ) và "+ Add Account".
  - **Quy trình Add / Re-login Wizard (`<dialog id="accountWizardDialog">`)**:
    - Bước 1: Chọn provider (Dreamina).
    - Bước 2: Hướng dẫn mở browser profile độc lập (cửa sổ trình duyệt riêng biệt, không lưu mật khẩu).
    - Bước 3: Animation kiểm tra phiên xác thực qua Playwright Runtime.
    - Bước 4: Thông báo thành công và cập nhật trạng thái `ACTIVE`.

---

### 3.4 Màn Hình 3: Projects Library (`#screen-projects`)
- **Mục đích**: Quản lý kho dự án video trên ổ cứng máy tính.
- **Thành phần**:
  - Bộ lọc theo tỉ lệ khung hình (16:9 Cinema, 9:16 Shorts/TikTok, 1:1 Vuông) và tìm kiếm theo tên.
  - Grid danh thiếp dự án với ảnh bìa, số lượng scenes, thời lượng tổng, tỉ lệ hoàn thành và thời gian cập nhật.
  - Thẻ tạo dự án mới mở modal `newProjectDialog` với tên dự án, tỉ lệ khung hình và prompt khởi tạo.

---

### 3.5 Màn Hình 4: Studio Workspace — Quy Trình 8 Bước (`#screen-workspace`)
- **Mục đích**: Xưởng sản xuất video toàn diện, từ kịch bản tới bản render cuối cùng.
- **8 Sub-stages trong Workspace**:
  1. **Overview & Health**: Tiến độ tổng thể 5 mốc sản xuất; Cảnh báo các vấn đề chặn render (Missing video clips, Character turnaround warning).
  2. **Story & Bible**: Cấu hình Story Bible (tiền đề câu chuyện, phong cách nghệ thuật neo đậu), Bảng phân tích các nhịp hình ảnh (Visual Beats).
  3. **Characters**: Hồ sơ nhân vật phân tách rõ **Character Identity** (ảnh chân dung chuẩn Master Reference, đặc trưng bất biến) và **Mutable State** (vết thương, trang phục thay đổi theo từng scene), gán giọng đọc TTS.
  4. **Storyboard**: Bảng phân cảnh từng shot với phân loại góc máy (Close-Up, Wide, Dutch Angle), chuyển động camera, ánh sáng và prompt sinh ảnh.
  5. **Visuals & Gen**: Bàn làm việc Prompt Engineering, chọn Model, tỉ lệ khung hình, sinh 4 candidates, so sánh và khóa (Lock) candidate ưng ý cho scene.
  6. **Audio & Timing**: Soạn thảo lời thoại nhân vật, gán người nói, nghe thử âm thanh tổng hợp TTS và **trình xem Word-Level Forced Alignment Timestamps** (ASR WhisperX).
  7. **Timeline NLE**: Bàn dựng phi tuyến tính đa track (Video Track, Dialogue Audio, BGM Music, Sound FX, Subtitles), hiển thị Timecode chính xác đến từng frame, con trỏ thời gian (Playhead) và các nút cắt ghép.
  8. **Render & Export**: Trình biên dịch `RenderPlan` tự động kiểm tra Pre-flight QC (phát hiện black frame, chuẩn hóa âm lượng -14 LUFS, đồng bộ phụ đề), tạo lệnh FFmpeg tối ưu phần cứng (NVENC H.264/HEVC) và xuất file MP4.

---

### 3.6 Màn Hình 5: Durable Jobs Monitor (`#screen-jobs`)
- **Mục đích**: Giám sát và phục hồi các tác vụ chạy nền dài hạn theo mô hình bền vững.
- **Thành phần**:
  - Bộ lọc: All, Running, Queued, Failed.
  - Thẻ Job chi tiết: Mã ID, loại task (`VIDEO GENERATION`, `TTS SYNTHESIS`, `FORCED ALIGNMENT`), Scene liên quan, Tài khoản lease đang giữ (`creator02@gmail.com`), Tiến độ % và thời gian đã chạy.
  - Xử lý lỗi: Hiển thị nguyên nhân lỗi kèm nút "Retry Job" và "View Log".

---

### 3.7 Màn Hình 6: System Diagnostics & Settings (`#screen-settings`)
- **Mục đích**: Kiểm tra toàn vẹn hạ tầng desktop, tài nguyên và đường dẫn lưu trữ.
- **Thành phần**:
  - Bảng đo kiểm tra các thành phần: FastAPI Sidecar, Playwright Runtime, SQLite Database WAL, FFmpeg Video Engine.
  - Cấu hình thư mục lưu dự án, thư mục cache browser profile độc lập và nút dọn dẹp bộ nhớ đệm.

---

## 4. Ánh Xạ Prototype Tới Mã Nguồn Frontend React (`vidpool-frontend`)

Toàn bộ frontend tuân thủ chuẩn Feature-Sliced Design (FSD):

| Màn hình / Tính năng | Canonical FSD Slice trong `vidpool-frontend/src/` | Trạng thái |
|---|---|---|
| App Shell & Layout | `src/widgets/sidebar/`, `src/app/layouts/app-layout.tsx` | IMPLEMENTED |
| Dashboard (Tổng quan) | `src/pages/dashboard/ui/dashboard-page.tsx` (sử dụng `AccountPoolSummary`) | DEMO / PROTOTYPE |
| Account Pool | `src/pages/accounts/ui/accounts-page.tsx`, `src/widgets/account-table/`, `src/widgets/account-pool-summary/`, `src/features/account-login/`, `src/features/account-pool/`, `src/entities/account/` | IMPLEMENTED |
| Projects Library | `src/pages/projects/ui/projects-page.tsx`, `src/entities/project/` | DEMO / PROTOTYPE |
| Chapters Studio | `src/pages/chapters/ui/chapter-page.tsx`, `src/features/chapters/` | DEMO / PROTOTYPE |
| Visual Beat Studio | `src/pages/visual-beat/ui/visual-beat-page.tsx` | DEMO / PROTOTYPE |
| Characters Studio | `src/pages/characters/ui/characters-page.tsx` | DEMO / PROTOTYPE |
| Voice & TTS Studio | `src/pages/voice/ui/voice-page.tsx` | DEMO / PROTOTYPE |
| Timeline Editor | `src/pages/editor/ui/editor-page.tsx` | DEMO / PROTOTYPE |
| Jobs & Queue Monitor | `src/pages/jobs/ui/jobs-page.tsx` | DEMO / PROTOTYPE |
| Settings | `src/pages/settings/ui/settings-page.tsx` | DEMO / PROTOTYPE |
| Design System Primitives | `src/shared/ui/` (`StatCard`, `StatusBadge`, `WaveformVisualizer`, `Button`, `Card`, `Input`, `Badge`) | IMPLEMENTED |
| API Client & Runtime Config | `src/shared/api/`, `src/shared/config/` | IMPLEMENTED |
| Isolated Demo Fixtures | `src/shared/demo/` (`projects.ts`, `jobs.ts`, `characters.ts`, `assets.ts`) | IMPLEMENTED |
