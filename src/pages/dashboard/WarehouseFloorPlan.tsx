import { useEffect, useRef, useState } from 'react'
import type { ZoneCode, ZoneInventorySummary } from '../../features/inventory/model/inventorySchemas'

type Hotspot = { id: string; label: string; zoneCode?: ZoneCode; x: number; y: number; capacity: number; used: number; cold?: boolean }

const hotspots: Hotspot[] = [
  { id: '입고처리장', label: '입고 처리장', x: 26.6, y: 15.2, capacity: 230, used: 101 }, { id: '반품처리장', label: '반품 처리장', x: 21.5, y: 23.6, capacity: 130, used: 22 },
  { id: 'D-01', label: 'D-01', zoneCode: 'D', x: 37.1, y: 20.8, capacity: 180, used: 68, cold: true }, { id: 'D-02', label: 'D-02', zoneCode: 'D', x: 39.3, y: 24.1, capacity: 180, used: 67, cold: true },
  { id: 'A-01', label: 'A-01', zoneCode: 'A', x: 53.9, y: 24.9, capacity: 320, used: 290 }, { id: 'A-02', label: 'A-02', zoneCode: 'A', x: 44.7, y: 32.1, capacity: 270, used: 130 }, { id: 'A-03', label: 'A-03', zoneCode: 'A', x: 53.2, y: 29.7, capacity: 230, used: 163 },
  { id: 'B-01', label: 'B-01', zoneCode: 'B', x: 73.1, y: 39.5, capacity: 270, used: 80 }, { id: 'B-02', label: 'B-02', zoneCode: 'B', x: 70.9, y: 41.4, capacity: 280, used: 250 },
  { id: 'C-01', label: 'C-01', zoneCode: 'C', x: 89.4, y: 50.3, capacity: 230, used: 207 }, { id: 'C-02', label: 'C-02', zoneCode: 'C', x: 88.3, y: 58, capacity: 230, used: 212 },
  { id: 'E-04', label: 'E-04', zoneCode: 'E', x: 33.5, y: 46.7, capacity: 360, used: 89 }, { id: 'E-02', label: 'E-02', zoneCode: 'E', x: 24.7, y: 50.3, capacity: 450, used: 200 }, { id: 'E-03', label: 'E-03', zoneCode: 'E', x: 39, y: 59.6, capacity: 420, used: 420 }, { id: 'E-01', label: 'E-01', zoneCode: 'E', x: 28.3, y: 61.9, capacity: 480, used: 420 },
  { id: 'F-01', label: 'F-01', zoneCode: 'F', x: 69.1, y: 79.5, capacity: 230, used: 80 }, { id: 'F-02', label: 'F-02', zoneCode: 'F', x: 66.9, y: 83.7, capacity: 190, used: 67 },
  { id: '출고장', label: '출고장', x: 46.4, y: 63.6, capacity: 240, used: 38 }, { id: '폐기처리장', label: '폐기 처리장', x: 55.7, y: 70.3, capacity: 80, used: 72 },
]

function statusOf(item: Hotspot) { const ratio = item.used / item.capacity; return ratio >= .95 ? 'critical' : ratio >= .8 ? 'warning' : 'ok' }
function statusLabel(status: ReturnType<typeof statusOf>) { return status === 'critical' ? '포화 임박' : status === 'warning' ? '주의' : '정상' }
const zoneNames: Record<ZoneCode, string> = { A: '원두', B: '시럽', C: '분말/파우더', D: '유제품', E: '컵/소모품/포장재', F: 'MD 상품' }

// Location 박스는 물컵처럼 그린다 — 컵 자체의 높이는 capacity(같은 그룹 내 상대적 크기)에 비례하고,
// 그 안을 채우는 물의 높이는 used/capacity 비율에 비례한다. 그룹(보관 Location vs 작업 구역)별
// 최소/최대 capacity를 hotspots에서 직접 계산해 두 range로 스케일링하므로, capacity 값이 바뀌어도
// 하드코딩된 기준값 때문에 비율이 깨지는 일이 없다.
const zoneCapacities = hotspots.filter((item) => item.zoneCode).map((item) => item.capacity)
const workCapacities = hotspots.filter((item) => !item.zoneCode).map((item) => item.capacity)
const zoneCapacityRange: [number, number] = [Math.min(...zoneCapacities), Math.max(...zoneCapacities)]
const workCapacityRange: [number, number] = [Math.min(...workCapacities), Math.max(...workCapacities)]
function scaleCapacity(capacity: number, [inMin, inMax]: [number, number], [outMin, outMax]: [number, number]) {
  if (inMax === inMin) return (outMin + outMax) / 2
  return outMin + (outMax - outMin) * (capacity - inMin) / (inMax - inMin)
}
function containerHeightFor(item: Hotspot) {
  return item.zoneCode ? scaleCapacity(item.capacity, zoneCapacityRange, [13, 52]) : scaleCapacity(item.capacity, workCapacityRange, [9, 30])
}
function fillHeightFor(item: Hotspot) {
  return containerHeightFor(item) * Math.min(item.used / item.capacity, 1)
}

type Point = { x: number; y: number }
const layoutById: Record<string, { zone: string; col: number; row: number; w: number; d: number }> = {
  입고처리장: { zone: 'work', col: 2.1, row: 3.75, w: 2.3, d: 2.45 }, 반품처리장: { zone: 'work', col: 1.84, row: 6.05, w: 1.77, d: 1.77 },
  'D-01': { zone: 'D', col: 5.5, row: 4.07, w: .5, d: 2.03 }, 'D-02': { zone: 'D', col: 6.2, row: 4.07, w: .5, d: 2.03 },
  'A-01': { zone: 'A', col: 9.85, row: 2.64, w: 3.3, d: .57 }, 'A-02': { zone: 'A', col: 8.38, row: 4.98, w: .35, d: 2.91 }, 'A-03': { zone: 'A', col: 10.3, row: 3.79, w: 2.4, d: .58 },
  'B-01': { zone: 'B', col: 15.76, row: 2.64, w: 2.98, d: .57 }, 'B-02': { zone: 'B', col: 15.76, row: 3.79, w: 2.98, d: .58 },
  'C-01': { zone: 'C', col: 20.8, row: 2.64, w: 2.4, d: .57 }, 'C-02': { zone: 'C', col: 21.73, row: 4.81, w: .55, d: 2.58 },
  'E-04': { zone: 'E', col: 7.2, row: 8.95, w: 2, d: .55 }, 'E-02': { zone: 'E', col: 5.6, row: 10.85, w: .55, d: 2.9 }, 'E-03': { zone: 'E', col: 10, row: 10.85, w: .55, d: 2.9 }, 'E-01': { zone: 'E', col: 7.8, row: 12.75, w: 4, d: .55 },
  출고장: { zone: 'work', col: 12.33, row: 10.9, w: 2.15, d: 2.3 }, 폐기처리장: { zone: 'work', col: 15.42, row: 11.32, w: 1.43, d: 1.47 },
  'F-01': { zone: 'F', col: 19.3, row: 10.9, w: 2.6, d: .6 }, 'F-02': { zone: 'F', col: 19.3, row: 12.05, w: 2.6, d: .6 },
}
const COS30 = Math.cos(Math.PI / 6), SIN30 = .5, SCALE = 68, ROT = 15 * Math.PI / 180
const PIVOT = { col: 11.785, row: 7.52 }
const iso = (col: number, row: number, z = 0): Point => { const dx = col - PIVOT.col; const dyUp = -(row - PIVOT.row); const rc = dx * Math.cos(ROT) - dyUp * Math.sin(ROT) + PIVOT.col; const rr = PIVOT.row - (dx * Math.sin(ROT) + dyUp * Math.cos(ROT)); return { x: (rc - rr) * SCALE * COS30, y: (rc + rr) * SCALE * SIN30 - z } }
const points = (value: Point[]) => value.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
const boxColors: Record<string, { side: string; top: string; edge: string }> = { work: { side: '#d7d2cd', top: '#e8e3de', edge: '#8b817b' }, A: { side: '#b7aa92', top: '#d8cdb8', edge: '#8f8068' }, B: { side: '#b99fa9', top: '#d7bec8', edge: '#92727e' }, C: { side: '#aaa6bd', top: '#c8c4d9', edge: '#817a9d' }, D: { side: '#9db8c2', top: '#bad2d9', edge: '#6f969f' }, E: { side: '#a8bc9f', top: '#c4d8bd', edge: '#718d69' }, F: { side: '#c9a26a', top: '#e8cd9d', edge: '#a67c3e' } }
const statusWaterColor: Record<ReturnType<typeof statusOf>, string> = { ok: '#4FB88C', warning: '#FFC15C', critical: '#FF5F5F' }
function boxFaces(layout: { col: number; row: number; w: number; d: number }, height: number) {
  const hw = layout.w / 2, hd = layout.d / 2
  const back = [layout.col - hw, layout.row - hd], right = [layout.col + hw, layout.row - hd], front = [layout.col + hw, layout.row + hd], left = [layout.col - hw, layout.row + hd]
  const P = (pt: number[], z: number) => iso(pt[0], pt[1], z)
  return {
    top: [P(back, height), P(right, height), P(front, height), P(left, height)],
    rightFace: [P(right, 0), P(front, 0), P(front, height), P(right, height)],
    leftFace: [P(left, 0), P(front, 0), P(front, height), P(left, height)],
  }
}
function DynamicWarehouseSvg({ items, activeId }: { items: Hotspot[]; activeId: string | null }) {
  const boxes = items.map((item) => { const layout = layoutById[item.id]; const cup = boxFaces(layout, containerHeightFor(item)); const water = boxFaces(layout, fillHeightFor(item)); const colors = boxColors[layout.zone]; return { item, cup, water, colors, depth: iso(layout.col, layout.row).y } }).sort((a, b) => a.depth - b.depth)
  const zonePatches = (['A', 'B', 'C', 'D', 'E', 'F'] as const).map((zone) => { const zoneItems = items.filter((item) => item.zoneCode === zone); const layouts = zoneItems.map((item) => layoutById[item.id]); const minCol = Math.min(...layouts.map((layout) => layout.col - layout.w / 2)) - .42; const maxCol = Math.max(...layouts.map((layout) => layout.col + layout.w / 2)) + .42; const minRow = Math.min(...layouts.map((layout) => layout.row - layout.d / 2)) - .42; const maxRow = Math.max(...layouts.map((layout) => layout.row + layout.d / 2)) + .42; const corners = [iso(minCol, minRow), iso(maxCol, minRow), iso(maxCol, maxRow), iso(minCol, maxRow)]; const label = iso((minCol + maxCol) / 2, minRow - .2); return { zone, corners, label } })
  const mainAisle = [iso(.3, 7.23), iso(22.8, 7.23), iso(22.8, 8.27), iso(.3, 8.27)]
  const mainAisleCenter = [iso(.3, 7.75), iso(22.8, 7.75)]
  const crossAisle = [iso(3.71, 1.3), iso(4.59, 1.3), iso(4.59, 7.9), iso(3.71, 7.9)]
  const crossAisleCenter = [iso(4.15, 1.3), iso(4.15, 7.9)]
  const mainLabel = iso(11.55, 7.75), crossLabel = iso(4.15, 4.6)
  const readableAngle = (start: Point, end: Point) => { const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI; return angle > 90 || angle < -90 ? angle + 180 : angle }
  const mainAngle = readableAngle(mainAisleCenter[0], mainAisleCenter[1])
  const crossAngle = readableAngle(crossAisleCenter[0], crossAisleCenter[1])
  return <svg className="dynamic-warehouse-svg" viewBox="-882.4 75.7 2222.1 1135.2" role="img" aria-label="재고 비율에 따라 높이가 변하는 창고 아이소뷰"><rect x="-882.4" y="75.7" width="2222.1" height="1135.2" fill="#050B1A" /><polygon points="-342.7,121.7 1305.7,671.2 800,1176.9 -848.4,627.4" fill="#0F1F3E" stroke="#3E6CA8" strokeWidth="1.5" /><g className="aisle-band"><polygon points={points(mainAisle)} /><polyline points={points(mainAisleCenter)} /><polygon points={points(crossAisle)} /><polyline points={points(crossAisleCenter)} /><text x={mainLabel.x} y={mainLabel.y - 8} textAnchor="middle" transform={`rotate(${mainAngle} ${mainLabel.x} ${mainLabel.y - 8})`}>MAIN AISLE · 주통로</text><text x={crossLabel.x} y={crossLabel.y} textAnchor="middle" transform={`rotate(${crossAngle} ${crossLabel.x} ${crossLabel.y})`}>CROSS AISLE · 교차통로</text></g>{zonePatches.map(({ zone, corners, label }) => <g key={zone} className={`zone-patch zone-patch-${zone.toLowerCase()}`}><polygon points={points(corners)} /><text x={label.x} y={label.y} textAnchor="middle">{zone} ZONE</text></g>)}<text x="-455" y="445" fill="#5E86B8" fontSize="10.5">입구 · ENTRY HALL</text>{boxes.map(({ item, cup, water, colors }) => { const filled = item.used > 0; const waterColor = statusWaterColor[statusOf(item)]; return <g key={item.id} className={`dynamic-box ${activeId === item.id ? 'active' : ''}`}><polygon points={points(cup.rightFace)} fill={colors.side} fillOpacity=".14" stroke={colors.edge} strokeOpacity=".55" strokeWidth="1" /><polygon points={points(cup.leftFace)} fill={colors.side} fillOpacity=".2" stroke={colors.edge} strokeOpacity=".65" strokeWidth="1" />{filled && <><polygon points={points(water.rightFace)} fill={waterColor} fillOpacity=".55" stroke={waterColor} strokeOpacity=".7" strokeWidth="1" /><polygon points={points(water.leftFace)} fill={waterColor} fillOpacity=".7" stroke={waterColor} strokeOpacity=".85" strokeWidth="1" /><polygon points={points(water.top)} fill={waterColor} fillOpacity=".85" stroke={waterColor} strokeWidth="1" /></>}<polygon points={points(cup.top)} fill={colors.top} fillOpacity=".1" stroke={colors.edge} strokeWidth="1.4" /><text x={cup.top.reduce((sum, p) => sum + p.x, 0) / 4} y={cup.top.reduce((sum, p) => sum + p.y, 0) / 4 + 4} fill="#DCEBFF" fontSize="12.5" fontWeight="600" textAnchor="middle">{item.label}</text></g> })}</svg>
}

export function WarehouseFloorPlan({ summaries }: { summaries: ZoneInventorySummary[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pinned, setPinned] = useState(false)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLElement>(null)
  const [viewportMetrics, setViewportMetrics] = useState<{ width: number; height: number; left: number; top: number; sceneWidth: number; sceneHeight: number } | null>(null)
  const items = hotspots
  void summaries
  const totalCapacity = items.reduce((sum, item) => sum + item.capacity, 0)
  const totalUsed = items.reduce((sum, item) => sum + item.used, 0)
  const coldItems = items.filter((item) => item.cold)
  const coldRate = Math.round(coldItems.reduce((sum, item) => sum + item.used, 0) / coldItems.reduce((sum, item) => sum + item.capacity, 0) * 100)
  const active = activeId ? items.find((item) => item.id === activeId) : undefined
  const percentage = active ? Math.round(active.used / active.capacity * 100) : 0
  const tooltipPlacement = active ? (() => {
    const metrics = viewportMetrics
    if (!metrics) return { left: `${Math.min(Math.max(active.x, 14), 86)}%`, top: `${Math.min(active.y + 10, 76)}%`, above: active.y > 28 }
    const { width, height } = metrics
    const localX = width * active.x / 100
    const localY = height * active.y / 100
    const centerX = width / 2
    const centerY = height / 2
    const x = metrics.left + centerX + (localX - centerX) * scale + pan.x
    const y = metrics.top + centerY + (localY - centerY) * scale + pan.y
    const tooltipWidth = 205
    const tooltipHeight = 190
    let above = y > tooltipHeight + 18
    let top = above ? y - 10 : y + 10
    if (!above && top + tooltipHeight > metrics.sceneHeight - 8) { above = true; top = y - 10 }
    if (above && top - tooltipHeight < 8) { above = false; top = y + 10 }
    const left = Math.min(Math.max(x, tooltipWidth / 2 + 8), metrics.sceneWidth - tooltipWidth / 2 - 8)
    return { left: `${left}px`, top: `${Math.max(8, top)}px`, above }
  })() : null
  const clampPan = (x: number, y: number, nextScale = scale) => {
    const scene = sceneRef.current
    if (!scene) return { x, y }
    const maxX = Math.max(0, (nextScale - 1) * scene.clientWidth / 2)
    const maxY = Math.max(0, (nextScale - 1) * scene.clientHeight / 2)
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) }
  }

  useEffect(() => {
    const updateViewportMetrics = () => {
      const viewport = viewportRef.current
      const scene = sceneRef.current
      if (!viewport || !scene) return
      setViewportMetrics({ width: viewport.clientWidth, height: viewport.clientWidth * 1135.2 / 2222.1, left: viewport.offsetLeft, top: viewport.offsetTop, sceneWidth: scene.clientWidth, sceneHeight: scene.clientHeight })
    }
    updateViewportMetrics()
    window.addEventListener('resize', updateViewportMetrics)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateViewportMetrics)
    if (observer && viewportRef.current) observer.observe(viewportRef.current)
    return () => { window.removeEventListener('resize', updateViewportMetrics); observer?.disconnect() }
  }, [])

  useEffect(() => {
    if (!pinned) return
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (tooltipRef.current?.contains(target) || target.closest('button')) return
      setPinned(false)
      setActiveId(null)
    }
    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [pinned])

  return <div className="reference-floor-plan">
    <div className="reference-stats"><div><span>총 Capacity</span><strong>{totalCapacity.toLocaleString()} <small>ea</small></strong></div><div><span>현재 재고</span><strong>{totalUsed.toLocaleString()} <small>ea</small></strong></div><div><span>전체 가동률</span><strong>{Math.round(totalUsed / totalCapacity * 100)}<small>%</small></strong></div><div><span>냉장(D Zone)</span><strong>{coldRate}<small>%</small></strong></div><div className="warn"><span>주의·포화 Location</span><strong>{items.filter((item) => statusOf(item) !== 'ok').length}<small>/{items.length}</small></strong></div></div>
    <div className="reference-status-legend"><span>재고 상태</span><i className="status-dot status-ok" /> 정상 <i className="status-dot status-warning" /> 주의 <i className="status-dot status-critical" /> 포화 임박</div>
    <div ref={sceneRef} className={`reference-scene ${dragStart ? 'is-dragging' : ''}`} onMouseLeave={() => { if (!pinned) setActiveId(null) }} onWheel={(event) => { event.preventDefault(); setScale((value) => { const next = Math.min(1.8, Math.max(1, value + (event.deltaY < 0 ? .08 : -.08))); setPan((current) => clampPan(current.x, current.y, next)); return next }) }} onPointerDown={(event) => { if ((event.target as HTMLElement).closest('button')) return; event.currentTarget.setPointerCapture(event.pointerId); setDragStart({ x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }) }} onPointerMove={(event) => { if (!dragStart) return; const sensitivity = 1.15; setPan(clampPan(dragStart.panX + (event.clientX - dragStart.x) * sensitivity, dragStart.panY + (event.clientY - dragStart.y) * sensitivity)) }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setDragStart(null) }} onPointerCancel={() => setDragStart(null)}>
      <div ref={viewportRef} className="reference-viewport"><div className="reference-stage" style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})` }}><DynamicWarehouseSvg items={items} activeId={activeId} />{items.map((item) => <button key={item.id} type="button" aria-label={`${item.label}, 사용률 ${Math.round(item.used / item.capacity * 100)}%`} className={`reference-hotspot ${item.zoneCode ? `zone-${item.zoneCode.toLowerCase()}` : 'zone-work'} ${statusOf(item)} ${activeId === item.id ? 'active' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onPointerDown={(event) => event.stopPropagation()} onMouseEnter={() => { if (!pinned) setActiveId(item.id) }} onMouseLeave={() => { if (!pinned && activeId === item.id) setActiveId(null) }} onFocus={() => { if (!pinned) setActiveId(item.id) }} onBlur={() => { if (!pinned && activeId === item.id) setActiveId(null) }} onClick={() => { setActiveId(item.id); setPinned((value) => activeId === item.id ? !value : true) }} />)}</div></div>
      {active && tooltipPlacement && <aside ref={tooltipRef} className={`reference-tooltip ${statusOf(active)} ${pinned ? 'is-pinned' : ''} ${tooltipPlacement.above ? 'is-above' : 'is-below'}`} style={{ left: tooltipPlacement.left, top: tooltipPlacement.top }}><div className="ref-tooltip-kicker">{active.zoneCode ? 'LOCATION' : 'WORK AREA'}</div><h3>{active.label}</h3><p>{active.zoneCode ? `${active.zoneCode} · ${zoneNames[active.zoneCode]} Zone` : '작업 구역'}</p>{active.cold && <strong className="ref-tooltip-cold">❄ 냉장 보관 구역</strong>}<div className="ref-tooltip-metrics"><strong>{active.used}<small>/{active.capacity}</small></strong><b>{percentage}%</b></div><div className="ref-tooltip-bar"><i style={{ width: `${percentage}%` }} /></div><div className="ref-tooltip-status"><span>● {statusLabel(statusOf(active))}</span></div><small className="ref-tooltip-hint">{pinned ? '고정됨 · 바깥을 클릭하면 해제됩니다' : '클릭하면 고정됩니다'}</small></aside>}
      <div className="reference-zoom"><button type="button" onClick={() => setScale((value) => { const next = Math.min(1.8, value + .12); setPan((current) => clampPan(current.x, current.y, next)); return next })}>+</button><button type="button" onClick={() => setScale((value) => { const next = Math.max(1, value - .12); setPan((current) => clampPan(current.x, current.y, next)); return next })}>−</button><button type="button" onClick={() => { setScale(1); setPan({ x: 0, y: 0 }) }}>⤢</button></div>
    </div>
  </div>
}
