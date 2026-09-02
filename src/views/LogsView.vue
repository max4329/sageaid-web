<template>
  <el-card shadow="never">
    <el-form :inline="true" :model="filters" @submit.prevent>
      <el-form-item label="窗口">
        <el-input v-model="filters.windowId" placeholder="输入窗口id" style="width: 180px" clearable />
      </el-form-item>

      <el-form-item label="用户">
        <el-input v-model="filters.username" placeholder="输入用户名（可空）" style="width: 180px" clearable />
      </el-form-item>

      <el-form-item label="手牌">
        <el-input v-model="filters.holeCards" placeholder='例如 "AdTd" / "Ad Td"' style="width: 200px" clearable />
      </el-form-item>

      <el-form-item label="时间范围">
        <el-date-picker v-model="filters.timeRange" type="datetimerange" start-placeholder="开始" end-placeholder="结束"
          value-format="x" :default-time="[new Date(0, 0, 0, 0, 0, 0), new Date(0, 0, 0, 23, 59, 59)]" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <div class="actions-bar">
    <el-button type="danger" plain :disabled="loading" @click="onClear">一键清空</el-button>
  </div>

  <el-card shadow="never" style="margin-top: 12px">
    <el-table :data="items" v-loading="loading" stripe>
      <el-table-column prop="requesterUsername" label="用户" width="140" />
      <el-table-column prop="windowId" label="窗口" min-width="160" />
      <el-table-column label="底牌" width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ handHole(row.handKey) }}</template>
      </el-table-column>
      <el-table-column label="位置" width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ handPos(row.handKey) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" min-width="180">
        <template #default="{ row }">{{ fmt(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row)">详情</el-button>
          <el-button size="small" type="danger" plain @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination layout="total, sizes, prev, pager, next, jumper" :total="total" :page-size="pageSize"
        :current-page="pageNumber" :page-sizes="[10, 20, 50, 100, 200]" @update:page-size="onUpdatePageSize"
        @update:current-page="onUpdatePageNumber" @size-change="onSearch" @current-change="onSearch" />
    </div>
  </el-card>

  <el-drawer v-model="drawerOpen" title="日志详情" size="70%" destroy-on-close>
    <div v-if="detailLoading">
      <el-skeleton :rows="6" animated />
    </div>
    <div v-else-if="!detail">
      <el-empty description="无数据" />
    </div>
    <div v-else>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="用户">{{ detail.requesterUsername }}</el-descriptions-item>
        <el-descriptions-item label="窗口">{{ detail.windowId }}</el-descriptions-item>
        <el-descriptions-item label="底牌">{{ handHole(detail.handKey) }}</el-descriptions-item>
        <el-descriptions-item label="位置">{{ handPos(detail.handKey) }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ fmt(detail.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ fmt(detail.updatedAt) }}</el-descriptions-item>
      </el-descriptions>

      <div class="events">
        <div class="events-title">事件序列</div>
        <el-timeline>
          <el-timeline-item v-for="ev in detail.events" :key="ev.seq" :timestamp="fmtAt(ev.at)">
            <div class="event-row">
              <div class="event-left">
                <div class="event-meta">seq: {{ ev.seq }}</div>
                <img v-if="ev.base64" class="event-img-sm" :src="toImgSrc(ev.base64)" alt="screenshot" />
              </div>
              <div class="event-right">
                <div v-if="rangeDebug(ev)" class="event-block range-debug">
                  <div class="event-block-head">
                    <div class="event-label">V4 翻前 Range Debug</div>
                    <el-button size="small" text @click="copyPretty('V4 Range Debug', rangeDebug(ev))">复制</el-button>
                  </div>
                  <div class="range-debug-grid">
                    <div class="range-debug-item">
                      <span class="range-debug-k">最终动作</span>
                      <span class="range-debug-v">{{ rangeDebug(ev).action }} {{ rangeDebug(ev).amountText }}</span>
                    </div>
                    <div class="range-debug-item">
                      <span class="range-debug-k">命中分支</span>
                      <span class="range-debug-v">{{ rangeDebug(ev).decisionLayer || 'NA' }}</span>
                    </div>
                    <div class="range-debug-item">
                      <span class="range-debug-k">Hero 策略</span>
                      <span class="range-debug-v">{{ rangeDebug(ev).heroMatchedText }}</span>
                    </div>
                    <div class="range-debug-item">
                      <span class="range-debug-k">筹码档/置信度</span>
                      <span class="range-debug-v">{{ rangeDebug(ev).stackText }}</span>
                    </div>
                  </div>
                  <div v-if="rangeDebug(ev).strategyText" class="range-debug-line">
                    <span class="range-debug-k">频率</span>
                    <span>{{ rangeDebug(ev).strategyText }}</span>
                  </div>
                  <div v-if="rangeDebug(ev).adjustmentText" class="range-debug-line">
                    <span class="range-debug-k">修正</span>
                    <span>{{ rangeDebug(ev).adjustmentText }}</span>
                  </div>
                  <div v-if="rangeDebug(ev).fallbackReason" class="range-debug-line is-warn">
                    <span class="range-debug-k">fallback</span>
                    <span>{{ rangeDebug(ev).fallbackReason }}</span>
                  </div>
                  <el-table
                    v-if="rangeDebug(ev).players.length"
                    :data="rangeDebug(ev).players"
                    size="small"
                    border
                    class="range-debug-table"
                  >
                    <el-table-column prop="position" label="位置" width="80" />
                    <el-table-column prop="status" label="状态" width="90" />
                    <el-table-column label="动作线" min-width="150" show-overflow-tooltip>
                      <template #default="{ row: p }">{{ p.lineText }}</template>
                    </el-table-column>
                    <el-table-column label="范围来源" min-width="180" show-overflow-tooltip>
                      <template #default="{ row: p }">{{ p.rangeSource || '未命中' }}</template>
                    </el-table-column>
                    <el-table-column label="置信度" width="90">
                      <template #default="{ row: p }">{{ p.confidenceText }}</template>
                    </el-table-column>
                    <el-table-column label="fallback" min-width="180" show-overflow-tooltip>
                      <template #default="{ row: p }">{{ p.fallbackReason || '' }}</template>
                    </el-table-column>
                  </el-table>
                </div>
                <div v-if="hasNonEmpty(ev.decision)" class="event-block">
                  <div class="event-block-head">
                    <div class="event-label">决策返回</div>
                    <el-button size="small" text @click="copyPretty('决策返回', ev.decision)">复制</el-button>
                  </div>
                  <pre class="event-pre">{{ pretty(ev.decision) }}</pre>
                </div>
                <div v-if="hasNonEmpty(ev.recognition)" class="event-block">
                  <div class="event-block-head">
                    <div class="event-label">识别结果</div>
                    <el-button size="small" text @click="copyPretty('识别结果', ev.recognition)">复制</el-button>
                  </div>
                  <pre class="event-pre">{{ pretty(ev.recognition) }}</pre>
                </div>
                <div v-if="hasNonEmpty(ev.requestJSON)" class="event-block">
                  <div class="event-block-head">
                    <div class="event-label">requestJSON</div>
                    <el-button size="small" text @click="copyPretty('requestJSON', ev.requestJSON)">复制</el-button>
                  </div>
                  <pre class="event-pre">{{ pretty(ev.requestJSON) }}</pre>
                </div>
                <div v-if="hasNonEmpty(ev.userPrompt)" class="event-block">
                  <div class="event-block-head">
                    <div class="event-label">userPrompt</div>
                    <el-button size="small" text @click="copyPretty('userPrompt', ev.userPrompt)">复制</el-button>
                  </div>
                  <pre class="event-pre">{{ pretty(ev.userPrompt) }}</pre>
                </div>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import { clearAiLogs, deleteAiLog, getAiLogById, queryAiLogs } from '../api/aiLogs'

const filters = reactive({
  windowId: undefined,
  username: '',
  holeCards: '',
  timeRange: [],
})

const loading = ref(false)
const items = ref([])
const total = ref(0)
const pageSize = ref(20)
const pageNumber = ref(1)

function onUpdatePageSize(v) {
  pageSize.value = v
}

function onUpdatePageNumber(v) {
  pageNumber.value = v
}

const drawerOpen = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

function fmt(v) {
  const d = new Date(v)
  if (!v || Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function fmtAt(v) {
  const d = new Date(v)
  if (!v || Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function pretty(v) {
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

function numText(v, digits = 1, suffix = '') {
  const n = Number(v)
  return Number.isFinite(n) ? `${n.toFixed(digits)}${suffix}` : 'NA'
}

function compactStrategy(strategy) {
  if (!strategy || typeof strategy !== 'object') return ''
  const parts = ['fold', 'call', 'raise', 'raise2']
    .map((k) => {
      const n = Number(strategy[k])
      return Number.isFinite(n) ? `${k}:${n.toFixed(1)}%` : ''
    })
    .filter(Boolean)
  return parts.join(' / ')
}

function compactAdjustments(adjustments) {
  if (!Array.isArray(adjustments) || !adjustments.length) return ''
  return adjustments
    .slice(0, 4)
    .map((a) => `${a.from}->${a.to}:${numText(a.points, 1, '%')}(${a.reason || 'context'})`)
    .join(' / ')
}

function getSatelliteV4Explain(ev) {
  const decision = ev?.decision
  if (!decision || typeof decision !== 'object') return null
  const direct = decision?.explain?.satelliteV4
  if (direct && typeof direct === 'object') return direct
  const nested = decision?.actionDecision?.explain?.satelliteV4
  if (nested && typeof nested === 'object') return nested
  const responseNested = decision?.data?.explain?.satelliteV4
  if (responseNested && typeof responseNested === 'object') return responseNested
  return null
}

function rangeDebug(ev) {
  const s4 = getSatelliteV4Explain(ev)
  if (!s4) return null
  const preflop = s4.preflop && typeof s4.preflop === 'object' ? s4.preflop : {}
  if (!Object.keys(preflop).length && !preflop.chipEvStrategy && !preflop.preflopRangeState) return null
  const state = preflop.preflopRangeState && typeof preflop.preflopRangeState === 'object'
    ? preflop.preflopRangeState
    : {}
  const heroLookup = preflop.chipEvStrategy || state.heroLookup || null
  const mixedStrategy = preflop?.chipEvDecision?.mixedStrategy || null
  const strategy = mixedStrategy?.adjustedStrategy || heroLookup?.strategy || null
  const decision = ev?.decision?.actionDecision || ev?.decision || {}
  const players = Array.isArray(state.players)
    ? state.players.map((p) => {
        const range = p?.range && typeof p.range === 'object' ? p.range : {}
        return {
          position: p?.position || '',
          status: p?.status || '',
          lineText: Array.isArray(p?.line) ? p.line.join(' -> ') : '',
          rangeSource: range.source || range.spotName || '',
          confidenceText: numText(p?.confidence, 2),
          fallbackReason: p?.fallbackReason || '',
        }
      })
    : []
  const source = heroLookup?.source || heroLookup?.spotName || ''
  const matched = heroLookup?.matched === true
  const fallbackReason = heroLookup?.fallbackReason || preflop?.chipEvDecision?.coldCallerAdjustment || ''
  const amount = decision.amount ?? decision.size
  return {
    action: decision.action || '',
    amountText: amount == null ? '' : numText(amount, 1, 'BB'),
    reason: decision.reason || '',
    decisionLayer: s4.decisionLayer || '',
    heroMatchedText: matched ? `${source || '已命中'}${heroLookup.positionAlias ? '（位置alias）' : ''}` : '未命中，走旧V4兜底',
    stackText: `${heroLookup?.stackBucket ?? 'NA'}BB / ${numText(heroLookup?.confidence, 2)}`,
    strategyText: mixedStrategy?.adjustedStrategy
      ? `${compactStrategy(strategy)}｜roll:${numText(mixedStrategy.roll, 2)}`
      : compactStrategy(strategy),
    adjustmentText: compactAdjustments(mixedStrategy?.contextAdjustments),
    fallbackReason,
    players,
    raw: { satelliteV4: s4 },
  }
}

function splitHandKey(handKey) {
  const s = String(handKey ?? '').trim()
  if (!s) return { hole: '', pos: '' }
  const [holeRaw, posRaw] = s.split('@@')
  return { hole: (holeRaw ?? '').trim(), pos: (posRaw ?? '').trim() }
}

function formatCardSuit(card) {
  const s = String(card ?? '').trim()
  if (!s) return ''
  // 识别形如 "Ad" / "TD" / "9h" 等
  const m = s.match(/^([2-9TJQKA])([dsch])$/i)
  if (!m) return s
  const rank = m[1].toUpperCase()
  const suit = m[2].toLowerCase()
  const suitMap = { d: '♦', s: '♠', c: '♣', h: '♥' }
  return `${rank}${suitMap[suit] ?? m[2]}`
}

function handHole(handKey) {
  const { hole } = splitHandKey(handKey)
  if (!hole) return ''
  const parts = hole.split(/[-\s]+/).filter(Boolean)
  if (parts.length === 0) return ''
  return parts.map(formatCardSuit).join(' ')
}

function handPos(handKey) {
  const { pos } = splitHandKey(handKey)
  return pos || ''
}

function hasNonEmpty(v) {
  if (v == null) return false
  if (typeof v === 'string') return !!v.trim()
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v).length > 0
  return true
}

function toImgSrc(b64) {
  if (typeof b64 !== 'string') return ''
  const s = b64.trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  return `data:image/png;base64,${s}`
}

async function copyPretty(label, value) {
  const text = pretty(value)
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success(`${label} 已复制`)
  } catch (e) {
    const msg = e?.message || '复制失败'
    ElMessage.error(msg)
  }
}

async function fetchList() {
  loading.value = true
  try {
    const [start, end] = Array.isArray(filters.timeRange) ? filters.timeRange : []
    const body = {
      windowId: filters.windowId ? String(filters.windowId).trim() : undefined,
      username: filters.username || undefined,
      holeCards: filters.holeCards || undefined,
      startTime: start ? Number(start) : undefined,
      endTime: end ? Number(end) : undefined,
      pageSize: pageSize.value,
      pageNumber: pageNumber.value,
    }
    const res = await queryAiLogs(body)
    items.value = res.items || []
    total.value = res.total || 0
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || '查询失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

function onSearch() {
  fetchList()
}

function onReset() {
  filters.windowId = undefined
  filters.username = ''
  filters.holeCards = ''
  filters.timeRange = []
  pageNumber.value = 1
  pageSize.value = 20
  fetchList()
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除该日志？（用户：${row.requesterUsername}，窗口：${row.windowId}）`, '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteAiLog(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch (e) {
    if (e === 'cancel') return
    const msg = e?.response?.data?.message || e?.message || '删除失败'
    ElMessage.error(msg)
  }
}

async function onClear() {
  try {
    await ElMessageBox.confirm('确认一键清空当前筛选范围内的日志？此操作不可恢复。', '提示', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const body = {
      username: filters.username || undefined,
      windowId: filters.windowId ? String(filters.windowId).trim() : undefined,
    }
    const res = await clearAiLogs(body)
    ElMessage.success(`已清空 ${res?.deleted ?? 0} 条`)
    pageNumber.value = 1
    fetchList()
  } catch (e) {
    if (e === 'cancel') return
    const msg = e?.response?.data?.message || e?.message || '清空失败'
    ElMessage.error(msg)
  }
}

async function openDetail(row) {
  drawerOpen.value = true
  detail.value = null
  detailLoading.value = true
  try {
    const res = await getAiLogById(row.id)
    detail.value = res
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || '拉取详情失败'
    ElMessage.error(msg)
  } finally {
    detailLoading.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.actions-bar {
  display: flex;
  /* justify-content: flex-end; */
  margin-top: 12px;
  padding-left: 10px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

.events {
  margin-top: 16px;
}

.events-title {
  font-weight: 700;
  margin: 12px 0;
}

.event-meta {
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.event-block {
  margin-top: 10px;
}

.event-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.event-label {
  font-weight: 600;
  margin-bottom: 6px;
}

.event-img {
  max-width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
}

.event-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.event-left {
  width: 360px;
  flex: 0 0 360px;
}

.event-right {
  flex: 1 1 auto;
  min-width: 0;
}

.event-img-sm {
  width: 360px;
  height: auto;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  display: block;
}

.event-pre {
  background: #0b1020;
  color: #d6deeb;
  padding: 10px 12px;
  border-radius: 6px;
  overflow-y: auto;
  overflow-x: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 420px;
}

.range-debug {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--el-fill-color-lighter);
}

.range-debug-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin-top: 6px;
}

.range-debug-item,
.range-debug-line {
  display: flex;
  gap: 8px;
  min-width: 0;
}

.range-debug-k {
  color: var(--el-text-color-secondary);
  flex: 0 0 auto;
}

.range-debug-v {
  font-weight: 600;
  word-break: break-word;
}

.range-debug-line {
  margin-top: 8px;
}

.range-debug-line.is-warn {
  color: var(--el-color-warning);
}

.range-debug-table {
  margin-top: 10px;
}
</style>
