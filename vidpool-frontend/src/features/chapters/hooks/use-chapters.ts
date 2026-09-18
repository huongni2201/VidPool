import { useState, useCallback, useMemo } from "react"
import type { Chapter } from "../model/types"
import { INITIAL_CHAPTERS } from "../api/chapter-api"

export function useChapters(initialChapterId: string = "chap-03") {
  const [chapters, setChapters] = useState<Chapter[]>(INITIAL_CHAPTERS)
  const [selectedId, setSelectedId] = useState<string>(initialChapterId)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isSaved, setIsSaved] = useState<boolean>(true)

  const selectedChapter = useMemo(() => {
    return chapters.find((c) => c.id === selectedId) || chapters[0]
  }, [chapters, selectedId])

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters
    const q = searchQuery.toLowerCase()
    return chapters.filter(
      (c) => c.title.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q)
    )
  }, [chapters, searchQuery])

  const updateSelectedChapter = useCallback(
    (updates: Partial<Omit<Chapter, "id" | "projectId">>) => {
      setChapters((prev) =>
        prev.map((c) => {
          if (c.id !== selectedId) return c
          const updated = { ...c, ...updates, updatedAt: "Vừa xong" }
          // If sourceText changed, recalculate word count
          if (updates.sourceText !== undefined) {
            const words = updates.sourceText
              .trim()
              .split(/\s+/)
              .filter(Boolean).length
            updated.stats = {
              ...updated.stats,
              wordCount: words,
            }
          }
          return updated
        })
      )
      setIsSaved(false)
    },
    [selectedId]
  )

  const addChapter = useCallback(() => {
    const nextOrder = chapters.length + 1
    const newChapter: Chapter = {
      id: `chap-${String(nextOrder).padStart(2, "0")}`,
      projectId: "proj-default",
      order: nextOrder,
      title: `Chapter ${String(nextOrder).padStart(2, "0")}: Phân đoạn mới`,
      summary: "Mô tả ngắn cho phân đoạn cốt truyện này...",
      sourceText: "",
      status: "draft",
      stats: {
        wordCount: 0,
        sceneCount: 0,
        visualBeatCount: 0,
      },
      updatedAt: "Vừa xong",
    }
    setChapters((prev) => [...prev, newChapter])
    setSelectedId(newChapter.id)
    setIsSaved(true)
  }, [chapters.length])

  const saveChapter = useCallback(() => {
    setIsSaved(true)
  }, [])

  return {
    chapters: filteredChapters,
    totalCount: chapters.length,
    selectedId,
    setSelectedId,
    selectedChapter,
    searchQuery,
    setSearchQuery,
    updateSelectedChapter,
    addChapter,
    saveChapter,
    isSaved,
  }
}
