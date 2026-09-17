import { useState } from "react"
import { useNavigationStore } from "@/app/store/navigation-store"
import { StatusBadge } from "@/components/shared/StatusBadge"

interface BeatScene {
  id: number
  num: string
  title: string
  prompt: string
  character: string
  characterAvatar?: string
  dialogue: string
  duration: string
  cameraAngle: "Cận cảnh" | "Trung cảnh" | "Toàn cảnh"
  status: "Đã tạo" | "Đang tạo" | "Chờ tạo"
  thumb: string
}

export function VisualBeatPage() {
  const { setScreen } = useNavigationStore()
  const [selectedId, setSelectedId] = useState<number>(1)
  const [filter, setFilter] = useState("all")

  const scenes: BeatScene[] = [
    {
      id: 1,
      num: "01",
      title: "Cô gái thức dậy",
      prompt: "Cô gái trẻ thức dậy trong phòng ngủ, ánh nắng buổi sáng chiếu qua rèm cửa, không khí ấm áp, đời thường, chân thực, soft light, cinematic, high quality",
      character: "Mai",
      characterAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      dialogue: "Một ngày mới lại bắt đầu...",
      duration: "00:03",
      cameraAngle: "Cận cảnh",
      status: "Đã tạo",
      thumb: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    },
    {
      id: 2,
      num: "02",
      title: "Nhìn ra khung cửa sổ",
      prompt: "Cô gái nhìn ra khung cửa sổ, ánh mắt suy tư, gió nhẹ thoảng qua mái tóc",
      character: "Minh",
      characterAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      dialogue: "Hôm nay... sẽ khác.",
      duration: "00:05",
      cameraAngle: "Trung cảnh",
      status: "Đang tạo",
      thumb: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    },
    {
      id: 3,
      num: "03",
      title: "Thành phố buổi sáng",
      prompt: "Toàn cảnh thành phố hiện đại, nhịp sống tấp nập buổi sớm, tia nắng vàng len lỏi",
      character: "-",
      dialogue: "-",
      duration: "00:04",
      cameraAngle: "Toàn cảnh",
      status: "Chờ tạo",
      thumb: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80",
    },
    {
      id: 4,
      num: "04",
      title: "Bước ra khỏi nhà",
      prompt: "Cô gái mang balo, bước ra khỏi nhà, nắng sớm ngập tràn lối đi",
      character: "Mai",
      characterAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      dialogue: "Đi thôi!",
      duration: "00:04",
      cameraAngle: "Trung cảnh",
      status: "Đã tạo",
      thumb: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80",
    },
    {
      id: 5,
      num: "05",
      title: "Gặp lại người quen",
      prompt: "Cô gái tình cờ gặp lại người bạn cũ trên phố, hai người nhìn nhau bất ngờ",
      character: "Mai & Minh",
      characterAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      dialogue: "Lâu rồi không gặp cậu!",
      duration: "00:06",
      cameraAngle: "Trung cảnh",
      status: "Đã tạo",
      thumb: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    },
    {
      id: 6,
      num: "06",
      title: "Cuộc trò chuyện chân thành",
      prompt: "Hai người ngồi trên sân thượng, trò chuyện dưới ánh chiều tà ấm áp",
      character: "Mai & Minh",
      characterAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      dialogue: "Cậu... vẫn như ngày xưa nhỉ?",
      duration: "00:08",
      cameraAngle: "Cận cảnh",
      status: "Đang tạo",
      thumb: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    },
    {
      id: 7,
      num: "07",
      title: "Những suy nghĩ",
      prompt: "Cô gái nhìn về phía xa, suy tư về tương lai và những ước mơ còn dang dở",
      character: "Mai",
      characterAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      dialogue: "Mình thật sự muốn làm gì?",
      duration: "00:05",
      cameraAngle: "Cận cảnh",
      status: "Chờ tạo",
      thumb: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    },
    {
      id: 8,
      num: "08",
      title: "Hoàng hôn trên thành phố",
      prompt: "Mặt trời lặn, thành phố lên đèn, biểu tượng thời gian trôi qua",
      character: "-",
      dialogue: "-",
      duration: "00:06",
      cameraAngle: "Toàn cảnh",
      status: "Chờ tạo",
      thumb: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80",
    },
  ]

  const currentScene = scenes.find((s) => s.id === selectedId) || scenes[0]

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col p-5 max-w-[1700px] mx-auto select-none overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#f3f6fc]">Visual Beat</h2>
          <p className="text-xs text-[#9ca8bc] mt-0.5">
            Lên kế hoạch từng phân cảnh, tạo video bằng AI theo kịch bản của bạn.
          </p>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#121824] px-3 py-1.5 text-xs font-semibold text-[#f3f6fc] hover:border-white/[0.16] transition-all">
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Kịch bản</span>
          </button>

          {/* Progress widget */}
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#121824] px-3 py-1.5">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[#9ca8bc]">Tiến độ tạo video</span>
                <span className="font-semibold text-white">6/12</span>
                <span className="text-[10px] text-blue-400">50%</span>
              </div>
              <div className="h-1 w-28 rounded-full bg-white/[0.1] overflow-hidden mt-1">
                <div className="h-full rounded-full bg-blue-500" style={{ width: "50%" }} />
              </div>
            </div>
            <button className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 transition-colors">
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Tạo tất cả</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#121824] p-1">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              filter === "all" ? "bg-blue-600 text-white" : "text-[#9ca8bc] hover:text-white"
            }`}
          >
            Tất cả (12)
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              filter === "pending" ? "bg-blue-600 text-white" : "text-[#9ca8bc] hover:text-white"
            }`}
          >
            Chờ tạo (3)
          </button>
          <button
            onClick={() => setFilter("generating")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              filter === "generating" ? "bg-blue-600 text-white" : "text-[#9ca8bc] hover:text-white"
            }`}
          >
            Đang tạo (2)
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              filter === "completed" ? "bg-blue-600 text-white" : "text-[#9ca8bc] hover:text-white"
            }`}
          >
            Đã hoàn thành (6)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm cảnh..."
              className="h-8 w-52 rounded-xl border border-white/[0.08] bg-[#121824] pl-7 pr-3 text-xs text-white placeholder-[#64748b] focus:border-blue-500 focus:outline-none"
            />
            <svg className="absolute left-2.5 top-2.5 size-3.5 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex items-center rounded-xl border border-white/[0.08] bg-[#121824] p-1">
            <button className="flex size-6 items-center justify-center rounded-lg bg-blue-600 text-white text-xs">
              ☰
            </button>
            <button className="flex size-6 items-center justify-center rounded-lg text-[#9ca8bc] hover:text-white text-xs">
              ⊞
            </button>
          </div>
        </div>
      </div>

      {/* Main Split View: Table (Left 8 cols) & Inspector (Right 4 cols) */}
      <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden">
        {/* Left: Beat Scenes Table */}
        <div className="col-span-8 flex flex-col rounded-xl border border-white/[0.08] bg-[#121824] overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#151c2a] border-b border-white/[0.08] text-[11px] font-semibold text-[#9ca8bc]">
                <tr>
                  <th className="p-3 w-8">
                    <input type="checkbox" className="rounded border-white/20 bg-white/10" />
                  </th>
                  <th className="py-3 px-2 w-10">#</th>
                  <th className="py-3 px-2 w-20">Hình ảnh</th>
                  <th className="py-3 px-2">Tên cảnh / Tóm tắt prompt</th>
                  <th className="py-3 px-2">Nhân vật</th>
                  <th className="py-3 px-2">Thoại (TTS)</th>
                  <th className="py-3 px-2">Thời lượng</th>
                  <th className="py-3 px-2">Góc máy</th>
                  <th className="py-3 px-2">Trạng thái</th>
                  <th className="py-3 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {scenes.map((s) => {
                  const isSelected = selectedId === s.id
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`group transition-colors cursor-pointer ${
                        isSelected ? "bg-blue-600/15" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => setSelectedId(s.id)}
                          className="rounded border-white/20 bg-white/10 accent-blue-500"
                        />
                      </td>
                      <td className="py-3 px-2 font-mono text-[#9ca8bc]">{s.num}</td>
                      <td className="py-2 px-2">
                        <img
                          src={s.thumb}
                          alt={s.title}
                          className="size-10 rounded-md object-cover border border-white/[0.08]"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col max-w-[200px]">
                          <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {s.title}
                          </span>
                          <span className="truncate text-[10.5px] text-[#64748b]">{s.prompt}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {s.characterAvatar ? (
                          <div className="flex items-center gap-1.5">
                            <img
                              src={s.characterAvatar}
                              alt={s.character}
                              className="size-6 rounded-full object-cover border border-white/20"
                            />
                            <span className="text-[11px] text-[#9ca8bc]">{s.character}</span>
                          </div>
                        ) : (
                          <span className="text-[#64748b]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 max-w-[140px] truncate text-[#9ca8bc]">
                        {s.dialogue !== "-" ? `"${s.dialogue}"` : "-"}
                      </td>
                      <td className="py-3 px-2 font-mono text-[#9ca8bc]">{s.duration}</td>
                      <td className="py-3 px-2 text-[#9ca8bc]">{s.cameraAngle}</td>
                      <td className="py-3 px-2">
                        <StatusBadge status={s.status} size="sm" />
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button className="text-[#64748b] hover:text-white p-1">
                          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Scene Details Inspector */}
        <div className="col-span-4 flex flex-col rounded-xl border border-white/[0.08] bg-[#121824] p-4 overflow-y-auto">
          {/* Top Title & Nav */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h3 className="text-sm font-bold text-[#f3f6fc]">Chi tiết cảnh</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9ca8bc] font-mono">&lt; {currentScene.id} / 12 &gt;</span>
              <button className="text-[#64748b] hover:text-white">✕</button>
            </div>
          </div>

          {/* Preview Video Frame */}
          <div className="relative mt-3 aspect-video w-full rounded-lg overflow-hidden bg-black border border-white/[0.08]">
            <img src={currentScene.thumb} alt={currentScene.title} className="size-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-center justify-between text-[11px] text-white">
              <div className="flex items-center gap-2">
                <button className="size-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40">
                  <svg className="size-3 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
                <span className="font-mono text-[10px]">00:00 / {currentScene.duration}</span>
              </div>
              <span>16:9</span>
            </div>
          </div>

          {/* Inspector Form Fields */}
          <div className="flex flex-col gap-3 mt-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#9ca8bc]">Tên cảnh</label>
              <input
                type="text"
                value={currentScene.title}
                readOnly
                className="mt-1 h-8 w-full rounded-lg border border-white/[0.08] bg-[#182132] px-2.5 text-white"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-[#9ca8bc]">
                <span>Prompt (mô tả hình ảnh)</span>
                <span className="text-[10px] text-[#64748b]">125/500</span>
              </div>
              <textarea
                rows={3}
                value={currentScene.prompt}
                readOnly
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#182132] p-2 text-xs text-white leading-relaxed resize-none"
              />
            </div>

            {/* Character info */}
            <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#182132] p-2">
              <div className="flex items-center gap-2">
                {currentScene.characterAvatar && (
                  <img
                    src={currentScene.characterAvatar}
                    alt={currentScene.character}
                    className="size-8 rounded-md object-cover"
                  />
                )}
                <div>
                  <span className="text-xs font-semibold text-white block">{currentScene.character}</span>
                  <span className="text-[10.5px] text-[#9ca8bc]">Nữ tự nhiên, trẻ trung</span>
                </div>
              </div>
              <button className="rounded bg-white/[0.08] px-2 py-1 text-[10.5px] font-semibold text-white hover:bg-white/[0.14]">
                Chỉnh sửa
              </button>
            </div>

            {/* TTS line */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-[#9ca8bc]">
                <span>Thoại</span>
                <span className="text-[10px] text-[#64748b]">25/100</span>
              </div>
              <input
                type="text"
                value={currentScene.dialogue}
                readOnly
                className="mt-1 h-8 w-full rounded-lg border border-white/[0.08] bg-[#182132] px-2.5 text-white"
              />
            </div>

            {/* Camera angle & Duration */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-[#9ca8bc] block">Thời lượng</span>
                <span className="text-xs font-semibold text-white font-mono mt-0.5 block">
                  ⏱ {currentScene.duration}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#9ca8bc] block">Góc máy</span>
                <span className="text-xs font-semibold text-white mt-0.5 block">
                  📹 {currentScene.cameraAngle}
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.08] mt-1">
              <button
                onClick={() => setScreen("editor")}
                className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.04] py-2 text-[11.5px] font-semibold text-white hover:bg-white/[0.08] transition-all text-center"
              >
                Mở trong Chỉnh sửa
              </button>
              <button className="rounded-lg border border-white/[0.1] bg-white/[0.04] p-2 text-white hover:bg-white/[0.08]">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setScreen("editor")}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[11.5px] font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-500 transition-all"
              >
                <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Tạo video</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
