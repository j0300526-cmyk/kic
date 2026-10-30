import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Shell } from './components/Shell'
import { initialControls, localPreview, mockAnalysis, PRESETS } from './data/mock'
import { api } from './lib/api'
import { normalizeWeights } from './lib/mixing'
import type { AgentControl, AgentId, AnalysisRun, OptimizationResult, Scenario, ViewId } from './types'

const AgentAnalysisView = lazy(() => import('./views/AgentAnalysis').then((module) => ({ default: module.AgentAnalysisView })))
const MixingView = lazy(() => import('./views/Mixing').then((module) => ({ default: module.MixingView })))
const OptimizationView = lazy(() => import('./views/Optimization').then((module) => ({ default: module.OptimizationView })))
const Overview = lazy(() => import('./views/Overview').then((module) => ({ default: module.Overview })))
const ReportView = lazy(() => import('./views/Report').then((module) => ({ default: module.ReportView })))
const ScenariosView = lazy(() => import('./views/Scenarios').then((module) => ({ default: module.ScenariosView })))

const SCENARIO_KEY = 'alphamix-scenarios-v1'

function seedScenarios(): Scenario[] {
  return ['balanced', 'defensive'].flatMap((preset) => {
    const controls = initialControls(preset)
    const result = localPreview(controls)
    if (!result) return []
    return [{
      id: `seed-${preset}`,
      name: PRESETS[preset].label,
      preset,
      savedAt: '2026-10-31T09:00:00+09:00',
      controls,
      result,
    }]
  })
}

function readScenarios(): Scenario[] {
  try {
    const stored = localStorage.getItem(SCENARIO_KEY)
    return stored ? JSON.parse(stored) as Scenario[] : seedScenarios()
  } catch {
    return seedScenarios()
  }
}

export default function App() {
  const [view, setView] = useState<ViewId>('overview')
  const [preset, setPreset] = useState('balanced')
  const [controls, setControls] = useState<AgentControl[]>(() => initialControls())
  const [analysis, setAnalysis] = useState<AnalysisRun>(mockAnalysis)
  const [result, setResult] = useState<OptimizationResult | null>(() => localPreview(initialControls()))
  const [baseline, setBaseline] = useState<OptimizationResult | null>(() => localPreview(initialControls()))
  const [busy, setBusy] = useState(false)
  const [serverOnline, setServerOnline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>(readScenarios)
  const baselineServerSet = useRef(false)

  useEffect(() => {
    let active = true
    api.getAnalysis()
      .then((data) => { if (active) { setAnalysis(data); setServerOnline(true) } })
      .catch(() => { if (active) setServerOnline(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const normalized = normalizeWeights(controls)
    if (!normalized) {
      setResult(null)
      setBusy(false)
      setError('모든 활성 Agent의 가중치가 0입니다. 계산을 중단했습니다.')
      return
    }

    const preview = localPreview(controls, analysis)
    setResult(preview)
    setError(null)
    setBusy(true)
    let active = true
    const timer = window.setTimeout(() => {
      api.optimize(analysis.analysis_run_id, controls)
        .then((data) => {
          if (!active) return
          setResult(data)
          setServerOnline(true)
          if (!baselineServerSet.current) {
            baselineServerSet.current = true
            setBaseline(data)
          }
        })
        .catch(() => {
          if (!active) return
          setServerOnline(false)
          setError('FastAPI 서버에 연결되지 않아 로컬 mock 프리뷰를 표시합니다.')
        })
        .finally(() => { if (active) setBusy(false) })
    }, 320)
    return () => { active = false; window.clearTimeout(timer) }
  }, [analysis, controls])

  useEffect(() => {
    localStorage.setItem(SCENARIO_KEY, JSON.stringify(scenarios))
  }, [scenarios])

  const applyPreset = (id: string) => {
    if (!PRESETS[id]) return
    setControls(initialControls(id))
    setPreset(id)
  }
  const updateWeight = (id: AgentId, value: number) => {
    setControls((items) => items.map((item) => item.id === id ? { ...item, rawWeight: value } : item))
    setPreset('custom')
  }
  const toggleAgent = (id: AgentId) => {
    setControls((items) => items.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item))
    setPreset('custom')
  }
  const saveScenario = (name: string) => {
    if (!result) return
    const scenario: Scenario = {
      id: globalThis.crypto?.randomUUID?.() ?? `scenario-${Date.now()}`,
      name,
      preset,
      savedAt: new Date().toISOString(),
      controls,
      result,
    }
    setScenarios((items) => [scenario, ...items])
    if (result.status !== 'preview') {
      void api.saveScenario(name, analysis.analysis_run_id, controls, result).catch(() => undefined)
    }
  }

  const sharedResult = result ?? baseline ?? localPreview(initialControls())!
  let content
  switch (view) {
    case 'agents': content = <AgentAnalysisView analysis={analysis} />; break
    case 'mixing': content = <MixingView controls={controls} preset={preset} result={result} baseline={baseline} error={error} onPreset={applyPreset} onWeight={updateWeight} onToggle={toggleAgent} onReset={() => applyPreset('balanced')} onOpenOptimization={() => setView('optimization')} />; break
    case 'optimization': content = <OptimizationView result={sharedResult} baseline={baseline} />; break
    case 'scenarios': content = <ScenariosView scenarios={scenarios} onSave={saveScenario} onLoad={(scenario) => { setControls(scenario.controls); setPreset(scenario.preset); setView('mixing') }} onDelete={(id) => setScenarios((items) => items.filter((item) => item.id !== id))} />; break
    case 'report': content = <ReportView analysis={analysis} result={sharedResult} />; break
    default: content = <Overview result={sharedResult} analysis={analysis} baseline={baseline} onOpenMixing={() => setView('mixing')} />
  }

  return (
    <Shell view={view} onViewChange={setView} serverOnline={serverOnline} busy={busy}>
      <Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-slate-500">화면을 불러오는 중…</div>}>
        {content}
      </Suspense>
    </Shell>
  )
}
