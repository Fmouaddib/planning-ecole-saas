/**
 * Composants graphiques SVG/CSS légers — pas de dépendance externe.
 * BarChart, DonutChart, HeatmapGrid
 */

// ==================== BAR CHART ====================

export interface BarChartItem {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarChartItem[]
  height?: number
  showValues?: boolean
  horizontal?: boolean
  className?: string
}

export function BarChart({
  data,
  height = 180,
  showValues = true,
  horizontal = false,
  className = '',
}: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  if (horizontal) {
    return (
      <div className={`space-y-2.5 ${className}`}>
        {data.map((item, i) => {
          const pct = (item.value / maxValue) * 100
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 w-24 truncate text-right shrink-0">
                {item.label}
              </span>
              <div className="flex-1 h-5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: item.color || 'var(--color-primary-500, #3b82f6)',
                  }}
                />
              </div>
              {showValues && (
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 w-8 text-right shrink-0">
                  {item.value}
                </span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Vertical SVG bars
  const barGap = 8
  const labelHeight = 22
  const valueHeight = showValues ? 18 : 0
  const svgHeight = height + labelHeight + valueHeight
  const barAreaHeight = height

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <svg
        viewBox={`0 0 ${data.length * 52 + barGap} ${svgHeight}`}
        className="w-full"
        style={{ minWidth: data.length * 40 }}
        preserveAspectRatio="xMidYMax meet"
      >
        {data.map((item, i) => {
          const barH = maxValue > 0 ? (item.value / maxValue) * (barAreaHeight - 4) : 0
          const x = i * 52 + barGap
          const barW = 36
          const y = valueHeight + barAreaHeight - barH

          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, 0)}
                rx={4}
                ry={4}
                fill={item.color || 'var(--color-primary-500, #3b82f6)'}
                className="transition-all duration-500"
              />
              {/* Value on top */}
              {showValues && item.value > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="fill-neutral-600 dark:fill-neutral-400"
                  style={{ fontSize: 11, fontWeight: 600 }}
                >
                  {item.value}
                </text>
              )}
              {/* Label */}
              <text
                x={x + barW / 2}
                y={svgHeight - 4}
                textAnchor="middle"
                className="fill-neutral-500 dark:fill-neutral-400"
                style={{ fontSize: 11 }}
              >
                {item.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ==================== DONUT CHART ====================

export interface DonutChartItem {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutChartItem[]
  size?: number
  thickness?: number
  className?: string
}

export function DonutChart({
  data,
  size = 140,
  thickness = 22,
  className = '',
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let cumulativeOffset = 0

  const segments = data
    .filter(d => d.value > 0)
    .map(item => {
      const pct = total > 0 ? item.value / total : 0
      const dashLength = pct * circumference
      const dashOffset = circumference - cumulativeOffset
      cumulativeOffset += dashLength
      return { ...item, dashLength, dashOffset, pct }
    })

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-4 ${className}`}>
      {/* Donut SVG */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-neutral-100 dark:text-neutral-800"
            strokeWidth={thickness}
          />
          {/* Segments */}
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          ))}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{total}</span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 min-w-0">
        {data.map((item, i) => (
          <div key={i} className={`flex items-center gap-2 ${item.value === 0 ? 'opacity-40' : ''}`}>
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
              {item.label}
            </span>
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 ml-auto">
              {item.value}
            </span>
          </div>
        ))}
        {data.every(d => d.value === 0) && (
          <span className="text-xs text-neutral-400">Aucune donnée</span>
        )}
      </div>
    </div>
  )
}

// ==================== HEATMAP GRID ====================

interface HeatmapGridProps {
  /** 2D array: rows × cols (values 0-1 for intensity, or raw counts) */
  data: number[][]
  rowLabels: string[]
  colLabels: string[]
  color?: string
  className?: string
}

export function HeatmapGrid({
  data,
  rowLabels,
  colLabels,
  color = '#3b82f6',
  className = '',
}: HeatmapGridProps) {
  // Normalize to 0-1 if values > 1
  const flatValues = data.flat()
  const maxVal = Math.max(...flatValues, 1)
  const needsNormalization = maxVal > 1

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="inline-grid gap-px" style={{ gridTemplateColumns: `auto repeat(${colLabels.length}, 1fr)` }}>
        {/* Top-left empty cell */}
        <div />
        {/* Column headers */}
        {colLabels.map((label, i) => (
          <div
            key={i}
            className="text-[10px] text-neutral-500 dark:text-neutral-400 text-center px-1 pb-1 font-medium"
          >
            {label}
          </div>
        ))}

        {/* Rows */}
        {data.map((row, ri) => (
          <>
            {/* Row label */}
            <div
              key={`label-${ri}`}
              className="text-[10px] text-neutral-500 dark:text-neutral-400 pr-2 flex items-center justify-end font-medium"
            >
              {rowLabels[ri]}
            </div>
            {/* Cells */}
            {row.map((val, ci) => {
              const intensity = needsNormalization ? val / maxVal : val
              return (
                <div
                  key={`${ri}-${ci}`}
                  className="w-7 h-5 rounded-[3px] transition-colors"
                  style={{
                    backgroundColor: intensity > 0
                      ? color
                      : 'var(--heatmap-empty, rgba(0,0,0,0.04))',
                    opacity: intensity > 0 ? 0.15 + intensity * 0.85 : 1,
                  }}
                  title={`${rowLabels[ri]} ${colLabels[ci]} : ${needsNormalization ? val : Math.round(intensity * 100) + '%'}`}
                />
              )
            })}
          </>
        ))}
      </div>

      {/* Legend bar */}
      <div className="flex items-center gap-2 mt-3 text-[10px] text-neutral-500 dark:text-neutral-400">
        <span>Libre</span>
        <div className="flex gap-px">
          {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
            <div
              key={i}
              className="w-5 h-3 rounded-[2px]"
              style={{
                backgroundColor: v > 0 ? color : 'var(--heatmap-empty, rgba(0,0,0,0.04))',
                opacity: v > 0 ? 0.15 + v * 0.85 : 1,
              }}
            />
          ))}
        </div>
        <span>Occupé</span>
      </div>
    </div>
  )
}
