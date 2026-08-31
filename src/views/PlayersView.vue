<template>
  <el-card shadow="never">
    <el-form :inline="true" :model="filters" @submit.prevent>
      <el-form-item label="昵称">
        <el-input v-model="filters.keyword" placeholder="模糊匹配昵称" clearable style="width: 240px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <div class="actions-bar">
    <el-alert
      title="只有录入入池率可手动修改，其余画像字段由系统自动累计。"
      type="info"
      :closable="false"
      show-icon
    />
    <el-button type="success" @click="openCreate">新增/维护入池率</el-button>
  </div>

  <el-card shadow="never" style="margin-top: 12px">
    <el-table :data="items" v-loading="loading" stripe>
      <el-table-column prop="nickname" label="昵称" min-width="180" fixed="left" />
      <el-table-column prop="poolRate" label="录入入池率" width="120" fixed="left">
        <template #default="{ row }">{{ fmtPct(row.poolRate) }}</template>
      </el-table-column>
      <el-table-column prop="effectiveVpip" label="生效VPIP" width="110">
        <template #default="{ row }">{{ fmtPct(row.effectiveVpip) }}</template>
      </el-table-column>
      <el-table-column label="数据来源说明" width="140">
        <template #default="{ row }">{{ fmtVpipSource(row) }}</template>
      </el-table-column>
      <el-table-column prop="autoVpipRate" label="自动VPIP" width="110">
        <template #default="{ row }">{{ fmtPct(row.autoVpipRate) }}</template>
      </el-table-column>
      <el-table-column prop="autoPfrRate" label="自动PFR" width="110">
        <template #default="{ row }">{{ fmtPct(row.autoPfrRate) }}</template>
      </el-table-column>
      <el-table-column prop="autoThreeBetRate" label="自动3Bet" width="110">
        <template #default="{ row }">{{ fmtPct(row.autoThreeBetRate) }}</template>
      </el-table-column>
      <el-table-column prop="autoLimpRate" label="自动Limp" width="110">
        <template #default="{ row }">{{ fmtPct(row.autoLimpRate) }}</template>
      </el-table-column>
      <el-table-column prop="autoCallOpenRate" label="自动CallOpen" width="130">
        <template #default="{ row }">{{ fmtPct(row.autoCallOpenRate) }}</template>
      </el-table-column>
      <el-table-column prop="autoFoldTo3BetRate" label="自动FoldTo3Bet" width="150">
        <template #default="{ row }">{{ fmtPct(row.autoFoldTo3BetRate) }}</template>
      </el-table-column>
      <el-table-column prop="handsSeen" label="样本手数" width="100" />
      <el-table-column prop="vpipHands" label="VPIP次数" width="100" />
      <el-table-column prop="pfrHands" label="PFR次数" width="100" />
      <el-table-column prop="threeBetHands" label="3Bet次数" width="110" />
      <el-table-column prop="limpHands" label="Limp次数" width="100" />
      <el-table-column prop="callOpenHands" label="CallOpen次数" width="130" />
      <el-table-column prop="foldTo3betHands" label="FoldTo3Bet次数" width="140" />
      <el-table-column label="最近手牌Key" min-width="180">
        <template #default="{ row }">{{ row.lastHandKey || '-' }}</template>
      </el-table-column>
      <el-table-column label="更新时间" width="180">
        <template #default="{ row }">{{ fmt(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">修改</el-button>
          <el-button size="small" type="danger" plain @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        :page-size="pageSize"
        :current-page="pageNumber"
        :page-sizes="[10, 20, 50, 100, 200]"
        @update:page-size="onUpdatePageSize"
        @update:current-page="onUpdatePageNumber"
        @size-change="onSearch"
        @current-change="onSearch"
      />
    </div>
  </el-card>

  <el-dialog v-model="dialogOpen" :title="effectiveEdit ? '维护玩家入池率' : '新增玩家入池率'" width="520px">
    <el-form ref="formRef" :model="form" label-position="top">
      <el-form-item label="昵称" prop="nickname" :rules="[{ required: true, message: '请输入昵称', trigger: 'blur' }]">
        <el-input v-model="form.nickname" placeholder="nickname" :disabled="dialogMode === 'edit'" />
      </el-form-item>
      <el-form-item label="入池率（整数%）" prop="poolRate" :rules="[{ validator: validatePctRequired, trigger: 'blur' }]">
        <el-input v-model="form.poolRate" :placeholder="phPoolRate" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogOpen = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">{{ primaryBtnText }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deletePlayer, getPlayerProfile, queryPlayers, savePlayer } from '../api/players'

const filters = reactive({
  keyword: '',
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

const dialogOpen = ref(false)
const dialogMode = ref('create')
const saving = ref(false)
const formRef = ref()
const form = reactive({
  nickname: '',
  poolRate: '',
})

const existingPlayer = ref(null)
let nicknameTimer = null
let lookupSeq = 0

const effectiveEdit = computed(() => dialogMode.value === 'edit' || !!existingPlayer.value)
const primaryBtnText = computed(() => (effectiveEdit.value ? '更新入池率' : '保存'))

function phWithCurrent(base, currentVal) {
  if (!currentVal) return base
  return `当前：${currentVal}`
}

const phPoolRate = computed(() =>
  phWithCurrent('例如 35 表示 35%', existingPlayer.value ? fmtPct(existingPlayer.value.poolRate) : ''),
)

function fmt(v) {
  const d = new Date(v)
  if (!v || Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

function fmtPct(v) {
  if (v === undefined || v === null || v === '') return '-'
  const n = Number(v)
  if (!Number.isFinite(n)) return '-'
  return `${n}%`
}

function fmtVpipSource(row) {
  if (row?.poolRate !== undefined && row?.poolRate !== null && row?.poolRate !== '') {
    return '手工录入'
  }
  if (row?.autoVpipRate !== undefined && row?.autoVpipRate !== null && row?.autoVpipRate !== '') {
    return '自动统计回退'
  }
  return '暂无数据'
}

function toPctInt(v) {
  const s = String(v ?? '').trim()
  if (!s) return NaN
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

function validatePctRequired(_rule, value, cb) {
  const s = String(value ?? '').trim()
  if (!s) return cb(new Error('必填'))
  const n = Number(s)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 100) return cb(new Error('请输入 0~100 的整数'))
  cb()
}

async function fetchList() {
  loading.value = true
  try {
    const res = await queryPlayers({
      keyword: filters.keyword || undefined,
      pageSize: pageSize.value,
      pageNumber: pageNumber.value,
    })
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
  filters.keyword = ''
  pageNumber.value = 1
  pageSize.value = 20
  fetchList()
}

function openCreate() {
  dialogMode.value = 'create'
  form.nickname = ''
  form.poolRate = ''
  existingPlayer.value = null
  dialogOpen.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.nickname = row.nickname
  form.poolRate = row.poolRate === null || row.poolRate === undefined ? '' : String(row.poolRate)
  existingPlayer.value = row
  dialogOpen.value = true
}

watch(
  () => [dialogOpen.value, dialogMode.value, form.nickname],
  ([open, mode, nicknameRaw]) => {
    if (!open || mode !== 'create') {
      existingPlayer.value = null
      return
    }

    const nickname = String(nicknameRaw ?? '').trim()
    if (!nickname) {
      existingPlayer.value = null
      return
    }

    if (nicknameTimer) clearTimeout(nicknameTimer)
    const seq = ++lookupSeq
    nicknameTimer = setTimeout(async () => {
      try {
        const res = await getPlayerProfile(nickname)
        if (seq !== lookupSeq) return
        existingPlayer.value = res || null
      } catch (e) {
        if (seq !== lookupSeq) return
        const status = e?.response?.status
        if (status === 404) {
          existingPlayer.value = null
          return
        }
        const msg = e?.response?.data?.message || e?.message || '查询昵称失败'
        ElMessage.error(msg)
        existingPlayer.value = null
      }
    }, 300)
  },
)

async function onSave() {
  const ok = await formRef.value?.validate?.().then(
    () => true,
    () => false,
  )
  if (!ok) return

  saving.value = true
  try {
    const isEdit = effectiveEdit.value
    await savePlayer({
      nickname: form.nickname.trim(),
      poolRate: toPctInt(form.poolRate),
    })
    ElMessage.success(isEdit ? '入池率更新成功' : '玩家入池率保存成功')
    dialogOpen.value = false
    fetchList()
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || '保存失败'
    ElMessage.error(msg)
  } finally {
    saving.value = false
  }
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除该玩家画像？（昵称：${row.nickname}）`, '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deletePlayer(row.nickname)
    ElMessage.success('已删除')
    fetchList()
  } catch (e) {
    if (e === 'cancel') return
    const msg = e?.response?.data?.message || e?.message || '删除失败'
    ElMessage.error(msg)
  }
}

onMounted(fetchList)
</script>

<style scoped>
.actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.actions-bar :deep(.el-alert) {
  flex: 1;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}
</style>
