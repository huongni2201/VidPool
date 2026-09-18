# VidPool — Review toàn bộ source

> Historical review. Several findings below were fixed after this commit.
> See CURRENT_STATUS.md and the latest fix plan for current state.

Ngày: 2026-09-18. Skill: `code-review`, hai trục Standards và Spec.
HEAD cuối cùng kiểm tra: `d7af2061ede35641a712fc71023444568fd09a75`.

Trong lúc review, HEAD đổi từ `519dc23` sang `d7af206`; các phát hiện dưới đây đã được đối chiếu lại với file hiện tại. Không sử dụng nhận xét thiếu mutation lock của phiên bản cũ. Không sửa implementation hoặc tài liệu fix-plan đang staged của người dùng.

Phạm vi: backend bootstrap/API/security, accounts domain/application/persistence, browser runtime/provider adapters; frontend bootstrap/API/router/account flows và Chapter prototype; Tauri lifecycle, packaging, migrations, CI và các kiểm tra dự án. Đây là review tĩnh theo luồng và kiểm tra tự động, không phải chứng nhận mọi dòng mã đều không còn lỗi. Không audit mã thư viện, skill bên thứ ba, binary hoặc assets. Không tính các module roadmap chưa triển khai là lỗi.

P1 = nên sửa trước khi phát hành; P2 = lỗi cần sửa theo lịch. Chỉ kết luận lộ dữ liệu đã có bằng chứng; không suy diễn rằng token thật đã bị lộ.

## Standards

### S1 — [P1] Browser command có thể giữ toàn bộ hàng đợi vô thời hạn

- Vị trí: `vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py:101–113`.
- `_submit()` chờ `future.result()` không deadline. Timeout launch/navigation không bảo vệ callback `run_active`, `run_persisted_profile`, `evaluate` hoặc đóng context. Một operation không trả về làm các operation sau cùng chờ; validation còn giữ mutation lock của AccountService nên các thay đổi account khác bị chặn.
- Kiểm chứng: callback giả chờ Event giữ caller ở trạng thái blocked, kể cả sau khi `close_all()` trả về. Event được giải phóng sau phép thử, không để thread treo.
- Quy tắc: architecture review gate 5 về recovery; ADR-0018 về runtime owner. Cần deadline cho command và chính sách xử lý runtime không phản hồi, gồm cả queued futures; chỉ thêm timeout cho caller chưa đủ vì operation vẫn có thể chạy muộn.

### S2 — [P1] Shutdown báo STOPPED khi owner thread vẫn sống

- Vị trí: `vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py:366–374`; nhánh xóa trực tiếp tại `322–324`.
- Sau timeout chờ shutdown và timeout `join`, code luôn đặt STOPPED mà không kiểm tra thread. `delete_profile()` từ đó được phép gọi filesystem trực tiếp, vượt owner thread dù browser operation có thể vẫn dùng profile.
- Kiểm chứng trên callback bị giữ bằng Event: `state=STOPPED owner_alive=True caller_blocked=True`; resolver giả xác nhận nhánh delete trực tiếp được gọi khi owner còn sống. Không xóa profile thật.
- Quy tắc: ADR-0018 yêu cầu browser/profile lifecycle do owner quản lý. Chỉ chuyển STOPPED sau khi thread thực sự kết thúc; giữ trạng thái lỗi/stopping và từ chối xóa khi chưa xác nhận đã đóng.

### S3 — [P2] Validate session xóa cooldown chưa hết

- Vị trí: `vidpool-backend/app/modules/accounts/domain/account.py:114–118`.
- `record_validation(valid=True)` chuyển ACTIVE và xóa `cooldown_until`. Session còn đăng nhập không chứng minh provider đã hết rate limit.
- Kiểm chứng qua AccountService với SQLite thật và provider giả: đặt deadline t+15 phút, validate tại t+1, acquire ngay tại t+1 thành công.
- Vi phạm AGENTS.md #28: credential scheduling phải tôn trọng rate limits. Giữ nguyên deadline còn hiệu lực khi kiểm tra authentication.

### S4 — [P2] Hết cooldown vẫn không lấy được account

- Vị trí: `vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py:112–114`.
- `acquire_lru` chỉ chọn status ACTIVE, trong khi rate limit/temporary failure lưu COOLDOWN. `clear_elapsed_cooldown` không được application gọi nên so sánh thời gian trong query không phục hồi account.
- Kiểm chứng qua AccountService/SQLite: cooldown đến t+15, acquire ở t+16 vẫn ném `AccountUnavailable`.
- Quy tắc `17-domain-application-separation`: application phải điều phối domain transition. Phục hồi trạng thái hết hạn trong cùng transaction với eligibility/acquire.

### S5 — [P2] API trả nguyên thông tin lỗi infrastructure

- Vị trí: `vidpool-backend/app/modules/accounts/api/router.py:66–67`.
- `detail=str(exc)` cho BrowserUnavailable/ProviderUnavailable khiến đường dẫn profile tuyệt đối từ runtime đi thẳng ra frontend. Lỗi thiếu browser là một đường đi thực tế tạo message này.
- Kiểm chứng trực tiếp mapper: HTTP 503 chứa đầy đủ đường dẫn giả `C:/Users/Example/.vidpool/browser-profiles/...`.
- Quy tắc `13-errors-observability` yêu cầu user-safe errors và sanitized diagnostics. Dùng thông báo public cố định; chỉ giữ diagnostics đã lọc. Chưa có bằng chứng token thật bị lộ qua trường hợp này.

### S6 — [P2] Xóa account thành công dù profile nhạy cảm chưa được xóa

- Vị trí: `vidpool-backend/app/modules/accounts/application/service.py:139–146`.
- Xóa và commit account trước, sau đó gọi `delete_profile`; exception chỉ được log. Khi Windows khóa file, người dùng vẫn nhận 204, account biến mất nhưng cookie/session profile còn trên đĩa. Retry theo account ID nhận not-found; không có cleanup record để recovery.
- Bằng chứng: kiểm tra thứ tự commit, exception handler và endpoint DELETE; chưa fault-inject filesystem thật.
- Quy tắc AGENTS.md #13, #14 và ADR-0017 xem profile là dữ liệu nhạy cảm. Giữ cleanup intent có thể retry hoặc trạng thái pending-delete cho đến khi profile thực sự được dọn.

## Spec

### F1 — [P1] Lần chạy đầu chưa tạo/migrate database

- Vị trí: `vidpool-backend/app/core/container.py:57–63`; liên quan `scripts/build-sidecar.py:78–106`.
- Container chỉ tạo engine/sessionmaker; bootstrap/factory không chạy Alembic. Packaging không đưa migration assets vào executable hoặc cung cấp bước migration runtime. Cài mới không có bảng; cài nâng cấp cũng không tự áp dụng migration mới.
- Kiểm chứng với `VIDPOOL_DATA_DIR` trỏ tới thư mục tạm mới và TestClient thật: health 200, accounts có bearer hợp lệ trả 500, inspect database trả `tables=[]`.
- Đặc tả ADR-0015: người dùng mở một desktop app thay vì setup backend thủ công; design account flow phải sử dụng được ngay. Bundle migration assets, migrate trước readiness và báo lỗi khởi động nếu migration thất bại. Test khởi động trên DB mới và DB phiên bản cũ.

### F2 — [P1] Thêm trùng tài khoản khiến dialog không đóng được

- Vị trí: `vidpool-frontend/src/features/account-login/ui/add-account-dialog.tsx:129–132,148–154`; backend `login_service.py:140–147`.
- Backend phát hiện identity trùng, xóa provisional account và trả conflict. Frontend giữ accountId cũ; bấm Đóng gọi cancel, nhận 404 và return trước onClose. Mở lại trình duyệt cũng dùng ID đã bị xóa nên tiếp tục 404.
- Bằng chứng: đối chiếu nhánh duplicate cleanup với complete/cancel/restart của dialog; chưa chạy browser E2E tình huống này.
- CURRENT_STATUS cam kết cleanup duplicate conflict và cleanup khi dismiss. Xử lý account đã xóa như cleanup hoàn thành hoặc trả lỗi có mã terminal để frontend reset target; thêm test duplicate→close và duplicate→retry.

### F3 — [P2] Rời Accounts bỏ lại phiên đăng nhập đang mở

- Vị trí: `vidpool-frontend/src/features/account-login/ui/add-account-dialog.tsx:68–70,87–94`.
- Khi Back/navigation unmount dialog, relogin cleanup chỉ đổi boolean và new-login không có cleanup. Không gọi cancel tương ứng; browser và provisional account còn tồn tại. Nếu request start trả về sau unmount, cũng không còn owner dọn account mới.
- Bằng chứng: kiểm tra effect cleanup và các callback start; chưa E2E bằng provider thật.
- Design account pool §19: “login cancellation closes context”; CURRENT_STATUS cam kết cleanup khi modal dismiss. Cần owner cleanup qua unmount và xử lý response start đến muộn, tránh cancel nhầm login đã complete.

### F4 — [P2] Chapter đang chọn lệch URL

- Vị trí: `vidpool-frontend/src/features/chapters/hooks/use-chapters.ts:7,65–67`; `src/pages/chapters/ui/chapter-page.tsx:34`.
- Route param chỉ dùng làm initial state. Tại `/chapters/chap-03`, bấm Thêm chuyển selection sang chapter mới nhưng URL vẫn chap-03; route param thay đổi khi component còn mounted không cập nhật selectedId.
- Bằng chứng: theo dõi state setter và navigate: chỉ handleSelectChapter gọi navigate, addChapter không gọi.
- CURRENT_STATUS: “React Router URL state is the sole navigation source of truth.” Dẫn xuất selection từ URL, và navigate khi tạo/chọn chapter. Prototype không loại bỏ yêu cầu điều hướng nhất quán.

### F5 — [P2] Kết quả phân tích Chapter dùng chung giữa các chapter

- Vị trí: `vidpool-frontend/src/features/chapters/hooks/use-chapter-analyzer.ts:19–22`; `src/pages/chapters/ui/chapter-page.tsx:127,144`.
- Scenes được lưu theo chapterId nhưng result/progress/isAnalyzing là state dùng chung. Phân tích A rồi chuyển sang B vẫn hiển thị kết quả A dưới màn hình B, kể cả B chưa phân tích; trong khi danh sách scene đã lấy theo B.
- Bằng chứng: hook giữ một result và page truyền trực tiếp vào ChapterAnalysisResult, không tra theo selectedChapter.id. Đây là lỗi hiển thị trong prototype, không phải yêu cầu triển khai AI thật. Callback cập nhật chapter đã capture ID ban đầu nên không kết luận sai rằng completion luôn ghi sang B.
- Quy tắc ownership/source-of-truth và ý nghĩa chapter-specific analysis: lưu/đọc result, progress và trạng thái theo chapterId; thêm test chuyển chapter trong và sau analysis.

## Verification và giới hạn

| Kiểm tra | Kết quả |
|---|---|
| Backend pytest trên HEAD mới, basetemp trong workspace | 192 passed, 1 skipped |
| Account concurrency riêng | 10 passed, nằm trong suite backend |
| Ruff | Pass |
| Pyright | 0 errors, 0 warnings |
| Frontend Vitest trực tiếp | 19 files, 60 passed |
| Oxlint trực tiếp | Pass, 7 warnings |
| TypeScript + Vite build trực tiếp | Pass; cảnh báo chunk lớn |
| Rust `cargo test --locked --offline` | 5 passed |
| Docs / duplicate source / version sync | Pass |
| Fresh DB reproduction | Xác nhận health200/accounts500/no tables |
| Browser shutdown reproduction | Xác nhận STOPPED khi owner còn sống |
| Cooldown reproductions | Xác nhận cả bypass sớm và kẹt sau hạn |

Lần pytest đầu lỗi quyền truy cập thư mục temp mặc định; chạy lại với basetemp mới trong workspace đã qua. `pnpm check` wrapper không chạy được do auto-install cần network/TTY; các executable đã cài của lint/test/typecheck/build được chạy trực tiếp và đều qua. Cache phát sinh đã được dọn, không xóa node_modules.

Chưa chạy lại installer/PyInstaller, thao tác trên Dreamina thật, hoặc browser E2E; live test được skip. Test suite xanh không phủ nhận các edge cases nêu trên. Không dùng kết quả OCR vì Windows Application Control chặn executable. Các phát hiện đã có trong fix-plan cũ chỉ được giữ khi mã hiện tại vẫn chứng minh được.

Tổng: Standards 6 phát hiện (mức cao nhất P1: runtime block/shutdown), Spec 5 phát hiện (mức cao nhất P1: fresh database và duplicate-login dialog).
