import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ASSET_LABELS } from '../data/mock'
import type { AssetId, OptimizationResult } from '../types'

const colors: Record<AssetId, string> = {
  us_equity: '#55c8ff',
  us_treasury: '#64f5c2',
  gold: '#f6c85f',
  cash: '#94a3b8',
}

export function PortfolioChart({ current, baseline, compact = false }: { current: OptimizationResult; baseline?: OptimizationResult | null; compact?: boolean }) {
  const data = (Object.keys(ASSET_LABELS) as AssetId[]).map((asset) => ({
    asset: ASSET_LABELS[asset],
    current: current.portfolio_weights[asset] * 100,
    baseline: (baseline?.portfolio_weights[asset] ?? 0) * 100,
    key: asset,
  }))
  return (
    <div className={compact ? 'h-56' : 'h-72'} aria-label="포트폴리오 자산 비중 차트">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#17283b" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="asset" tick={{ fill: '#718096', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#59677a', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,.025)' }}
            contentStyle={{ background: '#0d1929', border: '1px solid #1d3047', borderRadius: 10, color: '#fff', fontSize: 12 }}
            formatter={(value, name) => {
              const numericValue = Array.isArray(value) ? value[0] : value
              return [`${Number(numericValue ?? 0).toFixed(1)}%`, name === 'current' ? '현재' : '기준']
            }}
          />
          {baseline && <Bar dataKey="baseline" fill="#24364b" radius={[4, 4, 0, 0]} maxBarSize={26} />}
          <Bar dataKey="current" radius={[4, 4, 0, 0]} maxBarSize={baseline ? 26 : 42}>
            {data.map((item) => <Cell key={item.key} fill={colors[item.key]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
