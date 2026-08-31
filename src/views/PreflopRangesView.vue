<template>
  <el-row :gutter="12">
    <el-col :span="10">
      <el-card shadow="never">
        <template #header>上传/版本管理</template>

        <el-form label-position="top" @submit.prevent>
          <el-form-item label="范围名称">
            <el-input v-model="importForm.name" placeholder="例如：8max 50BB GTO" />
          </el-form-item>
          <el-form-item label="唯一 Key">
            <el-input v-model="importForm.key" placeholder="例如：8max_50bb_v1" />
          </el-form-item>
          <el-form-item label="人数">
            <el-radio-group v-model="importForm.tableSize">
              <el-radio-button :label="8">8-max</el-radio-button>
              <el-radio-button :label="9">9-max</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="JSON 文件">
            <input type="file" accept=".json,application/json,text/plain" @change="onFileChange" />
            <div class="hint" v-if="fileName">已选择：{{ fileName }}</div>
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="importForm.activate">导入后加入启用范围</el-checkbox>
            <div class="hint">可同时启用 50BB、40BB、30BB 等多个筹码档，查询时按筹码命中。</div>
          </el-form-item>
          <el-button type="primary" :loading="importing" @click="onImport">导入范围表</el-button>
        </el-form>
      </el-card>

      <el-card shadow="never" class="mt">
        <template #header>
          <div class="card-header">
            <span>已导入版本</span>
            <el-button size="small" :loading="loadingSets" @click="fetchSets">刷新</el-button>
          </div>
        </template>
        <el-table :data="sets" v-loading="loadingSets" stripe>
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="tableSize" label="人数" width="72">
            <template #default="{ row }">{{ row.tableSize }}-max</template>
          </el-table-column>
          <el-table-column label="数量" width="110">
            <template #default="{ row }">{{ row.spotCount }}/{{ row.handCount }}</template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag v-if="row.isActive" type="success">启用</el-tag>
              <el-tag v-else type="info">未启用</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button size="small" :disabled="row.isActive" @click="onActivate(row)">
                {{ row.isActive ? '已启用' : '启用' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-col>

    <el-col :span="14">
      <el-card shadow="never">
        <template #header>范围查询/测试</template>
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="版本">
            <el-select v-model="queryForm.setId" clearable placeholder="当前启用" style="width: 180px">
              <el-option
                v-for="item in sets"
                :key="item.id"
                :label="`${item.name} (${item.tableSize}-max)`"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="人数">
            <el-select v-model="queryForm.tableSize" clearable style="width: 100px">
              <el-option label="8-max" :value="8" />
              <el-option label="9-max" :value="9" />
            </el-select>
          </el-form-item>
          <el-form-item label="Hero">
            <el-select v-model="queryForm.heroPos" clearable filterable style="width: 110px">
              <el-option v-for="pos in positions" :key="pos" :label="pos" :value="pos" />
            </el-select>
          </el-form-item>
          <el-form-item label="场景">
            <el-select v-model="queryForm.spotType" clearable style="width: 130px">
              <el-option label="RFI" value="rfi" />
              <el-option label="vs RFI" value="vs_rfi" />
              <el-option label="vs 3Bet" value="vs_3bet" />
              <el-option label="LFI" value="lfi" />
              <el-option label="vs ISO" value="vs_iso" />
            </el-select>
          </el-form-item>
          <el-form-item label="对手">
            <el-select v-model="queryForm.villainPos" clearable filterable style="width: 110px">
              <el-option v-for="pos in positions" :key="pos" :label="pos" :value="pos" />
            </el-select>
          </el-form-item>
          <el-form-item label="筹码">
            <el-input v-model="queryForm.stackBB" placeholder="50" style="width: 90px" />
          </el-form-item>
          <el-form-item label="手牌">
            <el-input v-model="queryForm.hand" placeholder="JTs" style="width: 90px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="querying" @click="onQuery">查询</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="mt">
        <template #header>查询结果</template>
        <el-table :data="queryResults" v-loading="querying" stripe>
          <el-table-column type="expand">
            <template #default="{ row }">
              <el-table :data="row.hands" size="small" border>
                <el-table-column prop="comboKey" label="手牌" width="80" />
                <el-table-column label="Fold" width="90">
                  <template #default="{ row: h }">{{ pct(h.foldFrequency) }}</template>
                </el-table-column>
                <el-table-column label="Call" width="90">
                  <template #default="{ row: h }">{{ pct(h.callFrequency) }}</template>
                </el-table-column>
                <el-table-column label="Raise" width="90">
                  <template #default="{ row: h }">{{ pct(h.raiseFrequency) }}</template>
                </el-table-column>
                <el-table-column label="Raise2" width="90">
                  <template #default="{ row: h }">{{ pct(h.raise2Frequency) }}</template>
                </el-table-column>
                <el-table-column label="EV" min-width="180">
                  <template #default="{ row: h }">
                    C {{ ev(h.callEv) }} / R {{ ev(h.raiseEv) }} / R2 {{ ev(h.raise2Ev) }}
                  </template>
                </el-table-column>
                <el-table-column label="尺寸" min-width="180">
                  <template #default="{ row: h }">
                    C {{ actionAmount(row, 'call') }} / R {{ actionAmount(row, 'raise') }} / R2 {{ actionAmount(row, 'raise2') }}
                  </template>
                </el-table-column>
              </el-table>
            </template>
          </el-table-column>
          <el-table-column prop="rangeSetName" label="版本" min-width="140" />
          <el-table-column prop="name" label="节点" min-width="160" />
          <el-table-column prop="group" label="组" width="80" />
          <el-table-column label="位置" width="150">
            <template #default="{ row }">
              {{ row.heroPosition }}<span v-if="row.villainPosition"> vs {{ row.villainPosition }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="spotType" label="场景" width="95" />
          <el-table-column label="筹码" width="80">
            <template #default="{ row }">{{ row.stackBB ?? 'NA' }}BB</template>
          </el-table-column>
          <el-table-column prop="nodeId" label="nodeId" width="100" />
          <el-table-column label="手牌数" width="80">
            <template #default="{ row }">{{ row.hands?.length || 0 }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  activatePreflopRange,
  importPreflopRange,
  listPreflopRanges,
  queryPreflopRanges,
} from '../api/preflopRanges'

const positions = ['BB', 'SB', 'BTN', 'CO', 'HJ', 'LJ', 'MP', 'UTG+1', 'UTG']
const sets = ref([])
const loadingSets = ref(false)
const importing = ref(false)
const querying = ref(false)
const selectedPayload = ref(null)
const fileName = ref('')
const queryResults = ref([])

const importForm = ref({
  name: '',
  key: '',
  tableSize: 8,
  activate: true,
})

const queryForm = ref({
  setId: null,
  tableSize: 8,
  heroPos: '',
  stackBB: '50',
  spotType: '',
  villainPos: '',
  hand: 'JTs',
})

function pct(v) {
  const n = Number(v)
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : 'NA'
}

function ev(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(3) : 'NA'
}

function actionAmount(spot, key) {
  const amount = Number(spot?.actionOptions?.[key]?.amount)
  return Number.isFinite(amount) ? `${amount}BB` : 'NA'
}

function makeDefaultKey(file) {
  const base = String(file?.name || 'preflop_range')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
  return `${importForm.value.tableSize}max_${base || 'range'}`
}

async function fetchSets() {
  loadingSets.value = true
  try {
    const res = await listPreflopRanges()
    sets.value = Array.isArray(res?.items) ? res.items : []
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e?.message || '获取范围表失败')
  } finally {
    loadingSets.value = false
  }
}

async function onFileChange(event) {
  const file = event?.target?.files?.[0]
  selectedPayload.value = null
  fileName.value = ''
  if (!file) return
  try {
    const text = await file.text()
    const json = JSON.parse(text)
    if (!json?.columns || !json?.table || !json?.nodes) {
      throw new Error('JSON 必须包含 columns/table/nodes')
    }
    selectedPayload.value = json
    fileName.value = file.name
    if (!importForm.value.name) importForm.value.name = file.name.replace(/\.[^.]+$/, '')
    if (!importForm.value.key) importForm.value.key = makeDefaultKey(file)
    ElMessage.success('文件已读取')
  } catch (e) {
    ElMessage.error(e?.message || '文件解析失败')
  }
}

async function onImport() {
  if (!selectedPayload.value) {
    ElMessage.warning('请先选择 JSON 文件')
    return
  }
  importing.value = true
  try {
    const res = await importPreflopRange({
      name: importForm.value.name,
      key: importForm.value.key,
      tableSize: importForm.value.tableSize,
      sourceType: 'web_upload',
      activate: importForm.value.activate,
      payload: selectedPayload.value,
    })
    ElMessage.success(`导入成功：${res.spots} 个节点，${res.hands} 条手牌`)
    await fetchSets()
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e?.message || '导入失败')
  } finally {
    importing.value = false
  }
}

async function onActivate(row) {
  const ok = await ElMessageBox.confirm(`启用范围表：${row.name}？`, '提示', {
    type: 'warning',
    confirmButtonText: '启用',
    cancelButtonText: '取消',
  }).then(
    () => true,
    () => false,
  )
  if (!ok) return
  try {
    await activatePreflopRange(row.id)
    await fetchSets()
    ElMessage.success('已加入启用范围')
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e?.message || '启用失败')
  }
}

async function onQuery() {
  querying.value = true
  try {
    const stack = String(queryForm.value.stackBB ?? '').trim()
    const res = await queryPreflopRanges({
      ...queryForm.value,
      stackBB: stack ? Number(stack) : undefined,
      activeOnly: !queryForm.value.setId,
    })
    queryResults.value = Array.isArray(res?.items) ? res.items : []
    if (!queryResults.value.length) ElMessage.info('没有命中结果')
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e?.message || '查询失败')
  } finally {
    querying.value = false
  }
}

onMounted(async () => {
  await fetchSets()
})
</script>

<style scoped>
.mt {
  margin-top: 12px;
}

.hint {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
