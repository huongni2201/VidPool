import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  useChapters,
  useChapterAnalyzer,
  ChapterList,
  ChapterHeader,
  ChapterEditorForm,
  AnalyzedSceneList,
  ChapterAnalysisSettings,
  ChapterAnalysisResult,
  ChapterAnalysisProgress,
  type ChapterTab,
} from "@/features/chapters"
import { ROUTES } from "@/shared/constants"

export function ChapterPage() {
  const { chapterId } = useParams<{ chapterId?: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ChapterTab>("content")

  const {
    chapters,
    totalCount,
    selectedId,
    setSelectedId,
    selectedChapter,
    searchQuery,
    setSearchQuery,
    updateSelectedChapter,
    addChapter,
    saveChapter,
    isSaved,
  } = useChapters(chapterId)

  const {
    settings,
    updateSetting,
    getChapterScenes,
    result,
    steps,
    isAnalyzing,
    startAnalysis,
  } = useChapterAnalyzer(selectedChapter.id)

  const currentScenes = getChapterScenes(selectedChapter.id)

  const handleSelectChapter = (id: string) => {
    setSelectedId(id)
    navigate(`/chapters/${id}`)
  }

  const handleAddChapter = () => {
    const newChapter = addChapter()
    navigate(`/chapters/${newChapter.id}`)
  }

  const handleStartAnalysis = () => {
    updateSelectedChapter({ status: "analyzing" })
    startAnalysis(selectedChapter.id, (sceneCount, beatCount) => {
      updateSelectedChapter({
        status: "analyzed",
        stats: {
          ...selectedChapter.stats,
          sceneCount,
          visualBeatCount: beatCount,
        },
      })
    })
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] max-w-[1760px] mx-auto p-4 gap-4 select-none overflow-hidden">
      {/* Col 1: Left Chapter List */}
      <ChapterList
        chapters={chapters}
        totalCount={totalCount}
        selectedId={selectedId}
        onSelect={handleSelectChapter}
        onAdd={handleAddChapter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Col 2: Center Editor & Analyzed Scenes */}
      <div className="flex flex-1 min-w-0 flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
        {/* Workspace Top Header */}
        <ChapterHeader
          chapter={selectedChapter}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSave={saveChapter}
          onAnalyze={handleStartAnalysis}
          isAnalyzing={isAnalyzing}
          isSaved={isSaved}
          onTitleChange={(title) => updateSelectedChapter({ title })}
        />

        {/* Tab-driven Content / View */}
        {activeTab === "content" && (
          <div className="flex flex-col gap-4">
            <ChapterEditorForm
              chapter={selectedChapter}
              onUpdate={updateSelectedChapter}
            />

            <AnalyzedSceneList
              scenes={currentScenes}
              onOpenVisualBeat={() => navigate(ROUTES.VISUAL_BEAT)}
            />
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="flex flex-col gap-4">
            <ChapterAnalysisSettings
              settings={settings}
              onUpdate={updateSetting}
              disabled={isAnalyzing}
            />
            <ChapterAnalysisProgress
              steps={steps}
              isAnalyzing={isAnalyzing}
              completedAt={result?.completedAt}
              sceneCount={currentScenes.length}
            />
          </div>
        )}

        {activeTab === "results" && (
          <div className="flex flex-col gap-4">
            <ChapterAnalysisResult result={result} />
            <AnalyzedSceneList
              scenes={currentScenes}
              onOpenVisualBeat={() => navigate(ROUTES.VISUAL_BEAT)}
            />
          </div>
        )}
      </div>

      {/* Col 3: Right Analysis Panels (Visible in standard desktop 3-col layout) */}
      <div className="hidden xl:flex w-88 shrink-0 flex-col gap-3.5 overflow-y-auto pr-1 custom-scrollbar">
        <ChapterAnalysisSettings
          settings={settings}
          onUpdate={updateSetting}
          disabled={isAnalyzing}
        />

        <ChapterAnalysisResult result={result} />

        <ChapterAnalysisProgress
          steps={steps}
          isAnalyzing={isAnalyzing}
          completedAt={result?.completedAt}
          sceneCount={currentScenes.length}
        />
      </div>
    </div>
  )
}
