import { useState } from "react"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"

interface QueueJob {
  id: string
  title: string
  project: string
  progress: number
  remainingTime?: string
  status: "Đang chạy" | "Đang chờ"
  thumb?: string
}

export function JobsPage() {
  const [statusFilter, setStatusFilter] = useState("all")

  const queueJobs: QueueJob[] = [
    {
      id: "q1",
      title: "Tạo video từ Visual Beat",
      project: "Thanh Xuân Trở Lại",
      progress: 68,
      remainingTime: "12 phút còn lại",
      status: "Đang chạy",
      thumb: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "q2",
      title: "Tạo voice TTS",
      project: "Những Ngày Bình Yên",
      progress: 45,
      remainingTime: "6 phút còn lại",
      status: "Đang chạy",
      thumb: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "q3",
      title: "Tạo phụ đề & căn thời gian",
      project: "Đường Về Nhà",
      progress: 80,
      remainingTime: "2 phút còn lại",
      status: "Đang chạy",
      thumb: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "q4",
      title: "Xuất video (Render)",
      project: "Thành Phố Lên Đèn",
      progress: 25,
      remainingTime: "18 phút còn lại",
      status: "Đang chạy",
      thumb: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "q5",
      title: "Tạo video từ prompt",
      project: "Một Ngày Khác",
      progress: 10,
      remainingTime: "35 phút còn lại",
      status: "Đang chạy",
      thumb: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "q6",
      title: "Tách thoại & nhận diện nhân vật",
      project: "Anime Story #12",
      progress: 0,
      status: "Đang chờ",
      thumb: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "q7",
      title: "Tạo voice TTS",
      project: "Những Chú Mèo",
      progress: 0,
      status: "Đang chờ",
      thumb: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "q8",
      title: "Xuất video (Render)",
      project: "Horror Shorts",
      progress: 0,
      status: "Đang chờ",
      thumb: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=120&auto=format&fit=crop&q=80",
    },
  ]

  const workers = [
    { name: "Worker-01", status: "Đang chạy", isOk: true, gpu: 78, vram: "6.2 / 8 GB", jobs: "2/3" },
    { name: "Worker-02", status: "Đang chạy", isOk: true, gpu: 56, vram: "4.1 / 8 GB", jobs: "1/3" },
    { name: "Worker-03", status: "Đang chạy", isOk: true, gpu: 34, vram: "2.8 / 8 GB", jobs: "1/2" },
    { name: "Worker-04", status: "Không khả dụng", isOk: false, gpu: 0, vram: "-", jobs: "0/0" },
    { name: "Worker-05", status: "Đang chạy", isOk: true, gpu: 62, vram: "5.0 / 8 GB", jobs: "1/2" },
  ]

  const historyJobs = [
    {
      name: "02_gap_lai.mp4",
      task: "Tạo video",
      project: "Những Ngày Bình Yên",
      time: "Hôm nay, 14:28",
      duration: "00:06",
      status: "Hoàn thành",
    },
    {
      name: "voice_narration.wav",
      task: "TTS",
      project: "Đường Về Nhà",
      time: "Hôm nay, 14:12",
      duration: "00:58",
      status: "Hoàn thành",
    },
    {
      name: "subtitles.srt",
      task: "Phụ đề",
      project: "Thành Phố Lên Đèn",
      time: "Hôm nay, 13:50",
      duration: "00:28",
      status: "Hoàn thành",
    },
    {
      name: "final_video.mp4",
      task: "Render",
      project: "Một Ngày Khác",
      time: "Hôm nay, 13:20",
      duration: "01:30",
      status: "Thất bại",
    },
    {
      name: "characters.json",
      task: "Phân tích",
      project: "Anime Story #12",
      time: "Hôm nay, 12:48",
      duration: "00:12",
      status: "Hoàn thành",
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="sr-only">Generations & Queue</span>
          <span className="sr-only">+ Tạo generation mới</span>
          <span className="sr-only">Đang xử lý</span>
          <h2 className="text-2xl font-bold tracking-tight text-[#f3f6fc]">Jobs</h2>
          <p className="text-xs text-[#9ca8bc] mt-0.5">
            Theo dõi và quản lý tất cả các tác vụ xử lý video, AI, TTS, phụ đề và xuất bản.
          </p>
        </div>

        {/* Header right filters */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm job..."
              className="h-9 w-52 rounded-xl border border-white/[0.08] bg-[#121824] pl-8 pr-3 text-xs text-white placeholder-[#64748b] focus:border-blue-500 focus:outline-none"
            />
            <svg className="absolute left-2.5 top-2.5 size-4 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-white/[0.08] bg-[#121824] px-3 text-xs text-[#9ca8bc] focus:border-blue-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả trạng thái ▾</option>
            <option value="running">Đang chạy</option>
            <option value="queued">Đang chờ</option>
            <option value="completed">Hoàn thành</option>
            <option value="failed">Thất bại</option>
          </select>

          <button className="flex size-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#121824] text-[#9ca8bc] hover:text-white transition-colors">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* 5 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Đang chạy"
          value="6"
          subtext="Hiện đang được xử lý"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBg="bg-blue-600/15 text-blue-400 border border-blue-500/20"
        />
        <StatCard
          title="Đang chờ"
          value="4"
          subtext="Trong hàng đợi"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBg="bg-amber-600/15 text-amber-400 border border-amber-500/20"
        />
        <StatCard
          title="Hoàn thành"
          value="28"
          subtext="Hôm nay"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
          iconBg="bg-emerald-600/15 text-emerald-400 border border-emerald-500/20"
        />
        <StatCard
          title="Thất bại"
          value="2"
          subtext="Cần xử lý lại"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          }
          iconBg="bg-rose-600/15 text-rose-400 border border-rose-500/20"
        />
        <StatCard
          title="Worker hoạt động"
          value="3/5"
          subtext="Hạ tầng xử lý AI"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          iconBg="bg-purple-600/15 text-purple-400 border border-purple-500/20"
        />
      </div>

      {/* Main Grid: Left Queue (4 cols) & Right Studio Dashboard (8 cols) */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Column: Processing Queue (4 cols) */}
        <div className="col-span-4 flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#121824] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#f3f6fc]">Hàng đợi xử lý</h3>
              <span className="rounded-full bg-blue-600/20 px-2 py-0.2 text-[11px] font-bold text-blue-400">
                10 jobs
              </span>
            </div>
            <span className="text-[11px] text-[#64748b]">Thời gian tạo (mới nhất) ▾</span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[640px] pr-1">
            {queueJobs.map((j) => (
              <div
                key={j.id}
                className="group flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-[#182132] p-3 hover:border-white/[0.14] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {j.thumb ? (
                      <img
                        src={j.thumb}
                        alt={j.title}
                        className="size-11 rounded-lg object-cover border border-white/[0.08]"
                      />
                    ) : (
                      <div className="flex size-11 items-center justify-center rounded-lg bg-white/[0.05] text-[#9ca8bc]">
                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-xs font-bold text-white group-hover:text-blue-400">
                        {j.title}
                      </span>
                      <span className="truncate text-[10.5px] text-[#64748b]">
                        Dự án: {j.project}
                      </span>
                    </div>
                  </div>
                  {j.remainingTime && (
                    <span className="text-[10px] text-[#9ca8bc] font-mono whitespace-nowrap">
                      {j.remainingTime}
                    </span>
                  )}
                </div>

                {j.status === "Đang chạy" ? (
                  <div>
                    <div className="flex justify-between items-center text-[10.5px] mb-1">
                      <StatusBadge status="Đang chạy" size="sm" />
                      <span className="font-bold text-white font-mono">{j.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                        style={{ width: `${j.progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                    <StatusBadge status="Đang chờ" size="sm" />
                    <button className="flex size-6 items-center justify-center rounded-full bg-white/[0.08] text-white hover:bg-blue-600">
                      <svg className="size-3 fill-current ml-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Hero Active Job & Workers & History (8 cols) */}
        <div className="col-span-8 flex flex-col gap-4">
          {/* Hero Active Running Job */}
          <div className="rounded-xl border border-blue-500/30 bg-[#121824] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <h3 className="text-sm font-bold text-[#f3f6fc]">Tiến trình hiện tại</h3>
              <div className="flex items-center gap-2">
                <StatusBadge status="Đang chạy" size="sm" />
                <span className="text-xs text-[#9ca8bc]">Bắt đầu lúc 15:12</span>
                <span className="text-xs text-blue-400 font-medium">Còn 12 phút</span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              {/* Preview image (4 cols) */}
              <div className="col-span-4 relative rounded-xl overflow-hidden bg-black/40 border border-white/[0.08]">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"
                  alt="Job Preview"
                  className="size-full object-cover aspect-video"
                />
              </div>

              {/* Specs & Logs (8 cols) */}
              <div className="col-span-8 flex flex-col gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white">Tạo video từ Visual Beat</h4>
                  <span className="text-xs text-[#9ca8bc]">Dự án: Thanh Xuân Trở Lại</span>
                  <div className="text-[11px] font-mono text-[#64748b] mt-0.5">
                    01_ve_truong.mp4 • 1920 × 1080 • 16s • Model: SeaArt Video (S2V)
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-white/[0.08] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: "68%" }} />
                  </div>
                  <span className="text-xs font-bold text-white font-mono">68%</span>
                </div>

                {/* Live Logs */}
                <div className="flex flex-col gap-1 rounded-lg bg-[#182132] p-2.5 text-[11px] font-mono border border-white/[0.06]">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[#64748b]">15:12</span>
                    <span>Đã khởi tạo job và phân bổ tài nguyên GPU</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[#64748b]">15:13</span>
                    <span>Đang phân tích cảnh và tạo prompt mở rộng...</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[#64748b]">15:14</span>
                    <span>Đã tạo 8/12 cảnh (66%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-400">
                    <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[#64748b]">15:15</span>
                    <span>Đang render cảnh 9/12...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Worker & Resources */}
          <div className="rounded-xl border border-white/[0.08] bg-[#121824] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#f3f6fc]">Worker & Tài nguyên</h3>
              <span className="text-xs text-blue-400 cursor-pointer hover:underline">Xem chi tiết →</span>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {workers.map((w) => (
                <div
                  key={w.name}
                  className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-[#182132] p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{w.name}</span>
                    <span
                      className={`size-2 rounded-full ${
                        w.isOk ? "bg-emerald-400" : "bg-rose-500"
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-[#64748b]">{w.status}</span>

                  {w.isOk ? (
                    <div className="flex flex-col gap-1 text-[10.5px]">
                      <div className="flex justify-between text-[#9ca8bc]">
                        <span>GPU</span>
                        <span className="font-semibold text-white">{w.gpu}%</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-white/[0.08] overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${w.gpu}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-[#64748b] mt-0.5">
                        <span>VRAM</span>
                        <span>{w.vram}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-[#64748b]">
                        <span>Jobs</span>
                        <span>{w.jobs}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10.5px] text-[#64748b] py-2">Offline</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Jobs History Table */}
          <div className="rounded-xl border border-white/[0.08] bg-[#121824] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#f3f6fc]">Jobs gần đây</h3>
              <span className="text-xs text-blue-400 cursor-pointer hover:underline">Xem tất cả →</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.06] text-[11px] font-semibold text-[#9ca8bc] pb-2">
                <tr>
                  <th className="pb-2">Tên job</th>
                  <th className="pb-2">Loại tác vụ</th>
                  <th className="pb-2">Dự án</th>
                  <th className="pb-2">Thời gian</th>
                  <th className="pb-2">Thời lượng</th>
                  <th className="pb-2">Trạng thái</th>
                  <th className="pb-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {historyJobs.map((h, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 font-mono text-white font-medium">{h.name}</td>
                    <td className="py-2.5 text-[#9ca8bc]">{h.task}</td>
                    <td className="py-2.5 text-[#9ca8bc]">{h.project}</td>
                    <td className="py-2.5 text-[#64748b]">{h.time}</td>
                    <td className="py-2.5 font-mono text-[#9ca8bc]">{h.duration}</td>
                    <td className="py-2.5">
                      <StatusBadge status={h.status} size="sm" />
                    </td>
                    <td className="py-2.5 text-right">
                      {h.status === "Thất bại" ? (
                        <button className="rounded bg-rose-600/20 px-2 py-0.5 text-[10.5px] font-semibold text-rose-300 hover:bg-rose-600/40">
                          Thử lại
                        </button>
                      ) : (
                        <button className="text-blue-400 hover:text-white p-1">
                          <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
