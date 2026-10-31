import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ASSET_LABELS } from '../data/mock'
import type { AssetId, OptimizationResult } from '../types'

const colors: Record<AssetId, string> = {
  us_equity: '#F0B90B',
  us_treasury: '#2EBDFF',
  gold: '#A78BFA',
  cash: '#0ECB81',
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
          <CartesianGrid stroke="#2B3139" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="asset" tick={{ fill: '#848E9C', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#5E6673', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,.025)' }}
            contentStyle={{ background: '#181A20', border: '1px solid #2B3139', borderRadius: 4, color: '#fff', fontSize: 12 }}
            formatter={(value, name) => {
              const numericValue = Array.isArray(value) ? value[0] : value
              return [`${Number(numericValue ?? 0).toFixed(1)}%`, name === 'current' ? '현재' : '기준']
            }}
          />
          {baseline && <Bar dataKey="baseline" fill="#3C424B" radius={[2, 2, 0, 0]} maxBarSize={26} isAnimationActive={false} />}
          <Bar dataKey="current" radius={[2, 2, 0, 0]} maxBarSize={baseline ? 26 : 42} isAnimationActive={false}>
            {data.map((item) => <Cell key={item.key} fill={colors[item.key]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
