import { useState } from "react"

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general")
  const [autostart, setAutostart] = useState(true)
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [cacheSize, setCacheSize] = useState(20)
  const [fontSize, setFontSize] = useState(48)
  const [exportSubtitles, setExportSubtitles] = useState(true)
  const [diagnosticRunning, setDiagnosticRunning] = useState(false)

  const tabs = [
    { id: "general", label: "Tổng quát" },
    { id: "providers", label: "AI / Provider" },
    { id: "voice", label: "Voice" },
    { id: "render", label: "Xuất & Render" },
    { id: "subtitles", label: "Phụ đề" },
    { id: "storage", label: "Lưu trữ" },
    { id: "advanced", label: "Nâng cao" },
    { id: "about", label: "Giới thiệu" },
  ]

  const runDiagnostics = () => {
    setDiagnosticRunning(true)
    setTimeout(() => {
      setDiagnosticRunning(false)
    }, 1200)
  }

  return (
    <div className="flex flex-col gap-5 p-6 max-w-[1600px] mx-auto select-none">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#f3f6fc]">Cài đặt</h2>
        <p className="text-xs text-[#9ca8bc] mt-0.5">
          Tùy chỉnh cấu hình ứng dụng VidPool theo nhu cầu của bạn.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-6 border-b border-white/[0.08] text-xs font-semibold overflow-x-auto pb-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-2 whitespace-nowrap transition-colors relative ${
              activeTab === t.id
                ? "text-white after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500"
                : "text-[#9ca8bc] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid Cards for Settings (2 Columns layout matching Screen 9) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Thông tin chung */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#121824] p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
              <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#f3f6fc]">Thông tin chung</h3>
              <p className="text-[11px] text-[#9ca8bc]">Thiết lập ngôn ngữ, giao diện và tùy chọn khởi động.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#9ca8bc]">Ngôn ngữ ứng dụng</span>
              <select className="h-8 rounded-lg border border-white/[0.08] bg-[#182132] px-3 text-white cursor-pointer w-48">
                <option>Tiếng Việt</option>
                <option>English</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#9ca8bc]">Giao diện</span>
              <select className="h-8 rounded-lg border border-white/[0.08] bg-[#182132] px-3 text-white cursor-pointer w-48">
                <option>Tối (Dark)</option>
                <option>Sáng (Light)</option>
                <option>Theo hệ thống</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <div>
                <span className="text-white font-medium block">Khởi động cùng hệ thống</span>
                <span className="text-[10.5px] text-[#64748b]">Tự động mở VidPool khi bật máy</span>
              </div>
              <button
                onClick={() => setAutostart(!autostart)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  autostart ? "bg-blue-600" : "bg-white/[0.15]"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${
                    autostart ? "left-4.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-medium block">Kiểm tra cập nhật tự động</span>
                <span className="text-[10.5px] text-[#64748b]">Tự động kiểm tra phiên bản mới</span>
              </div>
              <button
                onClick={() => setAutoUpdate(!autoUpdate)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  autoUpdate ? "bg-blue-600" : "bg-white/[0.15]"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${
                    autoUpdate ? "left-4.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Đường dẫn làm việc */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#121824] p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600/15 text-indigo-400">
              <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#f3f6fc]">Đường dẫn làm việc</h3>
              <p className="text-[11px] text-[#9ca8bc]">Thiết lập thư mục mặc định để lưu dự án, cache và xuất video.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mt-1 text-xs">
            <div>
              <label className="text-[11px] text-[#9ca8bc] mb-1 block">Thư mục dự án mặc định</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value="D:\VidPool\Projects"
                  className="h-8 flex-1 rounded-lg border border-white/[0.08] bg-[#182132] px-2.5 text-white font-mono text-[11px]"
                />
                <button className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#182132] px-3 text-xs text-white hover:bg-white/[0.08]">
                  <span>📁 Duyệt</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#9ca8bc] mb-1 block">Thư mục xuất video</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value="D:\VidPool\Exports"
                  className="h-8 flex-1 rounded-lg border border-white/[0.08] bg-[#182132] px-2.5 text-white font-mono text-[11px]"
                />
                <button className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#182132] px-3 text-xs text-white hover:bg-white/[0.08]">
                  <span>📁 Duyệt</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#9ca8bc] mb-1 block">Thư mục cache</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value="D:\VidPool\Cache"
                  className="h-8 flex-1 rounded-lg border border-white/[0.08] bg-[#182132] px-2.5 text-white font-mono text-[11px]"
                />
                <button className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#182132] px-3 text-xs text-white hover:bg-white/[0.08]">
                  <span>📁 Duyệt</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-[#9ca8bc] mb-1">
                <span>Dung lượng cache tối đa</span>
                <span className="font-mono text-white font-semibold">{cacheSize} GB</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={cacheSize}
                onChange={(e) => setCacheSize(Number(e.target.value))}
                className="w-full h-1 bg-white/[0.1] rounded accent-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <button className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10">
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Xóa cache</span>
              </button>
              <span className="text-[11px] text-[#64748b]">Đang sử dụng 12.6 GB / 50 GB</span>
            </div>
          </div>
        </div>

        {/* Card 3: AI Provider */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#121824] p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
              <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#f3f6fc]">AI Provider</h3>
              <p className="text-[11px] text-[#9ca8bc]">Kết nối và quản lý các nhà cung cấp AI cho tạo video, hình ảnh và xử lý nội dung.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-1 text-xs">
            {/* SeaArt */}
            <div className="flex items-center justify-between rounded-lg bg-[#182132] p-2.5 border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="size-7 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                  S
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">SeaArt</span>
                  <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    <span>Đã kết nối</span>
                  </div>
                </div>
              </div>
              <button className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white hover:bg-white/[0.08]">
                Cấu hình
              </button>
            </div>

            {/* OpenAI */}
            <div className="flex items-center justify-between rounded-lg bg-[#182132] p-2.5 border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="size-7 rounded-full bg-emerald-600/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  O
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">OpenAI</span>
                  <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    <span>Đã kết nối</span>
                  </div>
                </div>
              </div>
              <button className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white hover:bg-white/[0.08]">
                Cấu hình
              </button>
            </div>

            {/* Add Provider button */}
            <button className="flex items-center justify-between rounded-lg border border-dashed border-white/[0.12] p-2.5 text-xs text-[#9ca8bc] hover:border-white/[0.24] hover:text-white transition-all">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-bold text-sm">+</span>
                <span>Thêm provider khác</span>
              </div>
              <span className="text-[10px] text-[#64748b]">Kết nối với các dịch vụ AI khác &gt;</span>
            </button>
          </div>
        </div>

        {/* Card 4: VoiceStudio & Chẩn đoán */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#121824] p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
              <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#f3f6fc]">VoiceStudio</h3>
              <p className="text-[11px] text-[#9ca8bc]">Kết nối với VoiceStudio để sử dụng giọng đọc AI.</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-[#182132] p-2.5 border border-white/[0.06] text-xs">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-white">VoiceStudio</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Đã kết nối
              </span>
            </div>
            <button className="rounded-lg bg-blue-600/20 px-3 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-600 hover:text-white transition-colors">
              + Kiểm tra kết nối
            </button>
          </div>

          {/* Diagnostics widget */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06] mt-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Chẩn đoán hệ thống</h4>
                <span className="text-[10.5px] text-[#64748b]">Kiểm tra tình trạng hệ thống và các thành phần.</span>
              </div>
              <button
                onClick={runDiagnostics}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
              >
                {diagnosticRunning ? "Đang kiểm tra…" : "Chạy kiểm tra hệ thống"}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#9ca8bc] rounded-lg bg-[#182132] p-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span>Hệ thống hoạt động bình thường</span>
              </div>
              <span className="text-[#64748b]">Kiểm tra lần cuối: Hôm nay, 15:24</span>
            </div>
          </div>
        </div>

        {/* Card 5: Phụ đề mặc định */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#121824] p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-600/15 text-amber-400">
              <span className="font-bold text-sm">Aa</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#f3f6fc]">Phụ đề</h3>
              <p className="text-[11px] text-[#9ca8bc]">Thiết lập kiểu dáng phụ đề mặc định cho video mới.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#9ca8bc]">Font chữ mặc định</span>
              <select className="h-8 rounded-lg border border-white/[0.08] bg-[#182132] px-3 text-white w-48">
                <option>Be Vietnam Pro</option>
                <option>Inter</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-[#9ca8bc] mb-1">
                <span>Cỡ chữ mặc định</span>
                <span className="font-mono text-white font-semibold">{fontSize}</span>
              </div>
              <input
                type="range"
                min="24"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full h-1 bg-white/[0.1] rounded accent-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between rounded-lg bg-[#182132] p-2 border border-white/[0.06]">
                <span className="text-[11px] text-[#9ca8bc]">Màu chữ</span>
                <span className="size-5 rounded bg-white border border-white/20" />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#182132] p-2 border border-white/[0.06]">
                <span className="text-[11px] text-[#9ca8bc]">Màu viền</span>
                <span className="size-5 rounded bg-black border border-white/20" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 6: Thiết lập xuất Render */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#121824] p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
              <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#f3f6fc]">Thiết lập xuất (Render)</h3>
              <p className="text-[11px] text-[#9ca8bc]">Cài đặt mặc định cho xuất video.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1 text-xs">
            <div>
              <label className="text-[11px] text-[#9ca8bc] mb-1 block">Độ phân giải mặc định</label>
              <select className="h-8 w-full rounded-lg border border-white/[0.08] bg-[#182132] px-2 text-white">
                <option>1920 × 1080 (Full HD)</option>
                <option>3840 × 2160 (4K)</option>
                <option>1280 × 720 (HD)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-[#9ca8bc] mb-1 block">Tỷ lệ khung hình mặc định</label>
              <select className="h-8 w-full rounded-lg border border-white/[0.08] bg-[#182132] px-2 text-white">
                <option>16:9 (YouTube, Twitter)</option>
                <option>9:16 (TikTok, Shorts)</option>
                <option>1:1 (Square)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-[#9ca8bc] mb-1 block">Chất lượng mặc định</label>
              <select className="h-8 w-full rounded-lg border border-white/[0.08] bg-[#182132] px-2 text-white">
                <option>Cao (CRF 18)</option>
                <option>Tiêu chuẩn (CRF 23)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-[#9ca8bc] mb-1 block">Định dạng xuất mặc định</label>
              <select className="h-8 w-full rounded-lg border border-white/[0.08] bg-[#182132] px-2 text-white">
                <option>MP4 (H.264)</option>
                <option>MOV (ProRes)</option>
                <option>WebM (VP9)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-white pt-2 border-t border-white/[0.06] cursor-pointer">
            <input
              type="checkbox"
              checked={exportSubtitles}
              onChange={(e) => setExportSubtitles(e.target.checked)}
              className="rounded border-white/20 bg-white/10 accent-blue-500"
            />
            <span>Xuất phụ đề kèm theo (.srt / hardsub)</span>
          </label>
        </div>

        {/* Card 7: Thông tin ứng dụng */}
        <div className="col-span-1 md:col-span-2 flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#121824] p-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 font-bold text-sm">
              VP
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">VidPool AI Video Studio</h4>
              <p className="text-[11px] text-[#9ca8bc]">Phiên bản 1.0.0 (Build 20250415) • © 2025 VidPool. All rights reserved.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[#9ca8bc]">
            <button className="hover:text-blue-400 transition-colors">Kiểm tra cập nhật &gt;</button>
            <button className="hover:text-blue-400 transition-colors">Điều khoản sử dụng &gt;</button>
            <button className="hover:text-blue-400 transition-colors">Chính sách bảo mật &gt;</button>
          </div>
        </div>
      </div>
    </div>
  )
}
