<template>
  <el-card shadow="never">
    <el-form :inline="true" @submit.prevent>
      <el-form-item label="筛选">
        <el-input v-model="keyword" placeholder="按用户名筛选" clearable style="width: 240px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="fetchList">刷新</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <div class="actions-bar">
    <el-button type="success" @click="openCreate">{{ isAppKind ? '新增系统账号' : '新增后台账号' }}</el-button>
  </div>

  <el-card shadow="never" style="margin-top: 12px">
    <el-table :data="filteredItems" v-loading="loading" stripe>
      <el-table-column prop="username" label="用户名" min-width="220" />
      <el-table-column v-if="!isAppKind" prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'info'">
            {{ row.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="isAppKind" prop="multiOpenCount" label="多开数量" width="120" />
      <el-table-column v-if="isAppKind" label="过期时间" min-width="220">
        <template #default="{ row }">
          <el-tag v-if="isExpired(row.expiresAt)" type="danger" style="margin-right: 8px">已过期</el-tag>
          <span>{{ formatExpireTime(row.expiresAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="200">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="row.id === currentUserId"
            @click="onDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="dialogOpen" :title="isAppKind ? '新增系统账号' : '新增后台账号'" width="500px">
    <el-form ref="formRef" :model="form" label-position="top">
      <el-form-item label="用户名" prop="username" :rules="usernameRules">
        <el-input v-model="form.username" placeholder="请输入用户名" />
      </el-form-item>
      <el-form-item label="密码" prop="password" :rules="passwordRules">
        <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
      </el-form-item>
      <el-form-item v-if="!isAppKind" label="角色" prop="role">
        <el-select v-model="form.role" style="width: 100%">
          <el-option label="普通用户" value="user" />
          <el-option label="管理员" value="admin" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="isAppKind" label="多开数量" prop="multiOpenCount" :rules="multiOpenCountRules">
        <el-input-number
          v-model="form.multiOpenCount"
          :min="1"
          :step="1"
          :precision="0"
          :value-on-clear="1"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item v-if="isAppKind" label="过期时间" prop="expiresAt" :rules="expiresAtRules">
        <div class="expire-shortcuts">
          <el-tag
            v-for="item in expireOptions"
            :key="item.value"
            class="expire-tag"
            :effect="expireShortcut === item.value ? 'dark' : 'plain'"
            :type="expireShortcut === item.value ? 'primary' : 'info'"
            @click="applyExpireShortcut(item)"
          >
            {{ item.label }}
          </el-tag>
        </div>
        <el-date-picker
          v-model="form.expiresAt"
          type="datetime"
          placeholder="请选择过期时间"
          format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%"
          @change="onExpirePickerChange"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogOpen = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createAccount, deleteAccount, getAccounts } from '../api/accounts'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const items = ref([])
const keyword = ref('')

const dialogOpen = ref(false)
const formRef = ref()
const expireShortcut = ref('1d')
let skipExpirePickerChange = false
const form = ref({
  username: '',
  password: '',
  role: 'user',
  expiresAt: null,
  multiOpenCount: 1,
})

const expireOptions = [
  { label: '1小时', value: '1h', ms: 60 * 60 * 1000 },
  { label: '1天', value: '1d', ms: 24 * 60 * 60 * 1000 },
  { label: '7天', value: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '一个月', value: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
]

const usernameRules = [
  { required: true, message: '请输入用户名', trigger: 'blur' },
  { min: 3, message: '用户名至少 3 个字符', trigger: 'blur' },
]

const passwordRules = [
  { required: true, message: '请输入密码', trigger: 'blur' },
  { min: 6, message: '密码至少 6 个字符', trigger: 'blur' },
]

const multiOpenCountRules = [
  { required: true, message: '请填写多开数量', trigger: 'change' },
  {
    validator: (_rule, value, callback) => {
      if (!Number.isInteger(value) || value < 1) {
        callback(new Error('多开数量必须是不小于 1 的正整数'))
        return
      }
      callback()
    },
    trigger: 'change',
  },
]

const expiresAtRules = [
  { required: true, message: '请选择过期时间', trigger: 'change' },
  {
    validator: (_rule, value, callback) => {
      if (!value) {
        callback(new Error('请选择过期时间'))
        return
      }
      const date = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(date.getTime())) {
        callback(new Error('过期时间格式不正确'))
        return
      }
      if (date.getTime() <= Date.now()) {
        callback(new Error('过期时间必须晚于当前时间'))
        return
      }
      callback()
    },
    trigger: 'change',
  },
]

const accountKind = computed(() => (route.meta?.accountKind === 'admin' ? 'admin' : 'app'))
const isAppKind = computed(() => accountKind.value === 'app')

const currentUserId = computed(() => {
  const token = String(auth.token || '')
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const base = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base.padEnd(base.length + ((4 - (base.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded))
    return Number(payload?.sub) || null
  } catch {
    return null
  }
})

const filteredItems = computed(() => {
  const key = String(keyword.value ?? '').trim()
  if (!key) return items.value
  return items.value.filter((it) => String(it.username ?? '').includes(key))
})

function formatTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function formatExpireTime(value) {
  if (!value) return '永不过期'
  return formatTime(value)
}

function isExpired(value) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() <= Date.now()
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getAccounts(accountKind.value)
    items.value = Array.isArray(res?.items) ? res.items : []
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || '获取失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

function applyExpireShortcut(item) {
  expireShortcut.value = item.value
  skipExpirePickerChange = true
  form.value.expiresAt = new Date(Date.now() + item.ms)
  queueMicrotask(() => {
    skipExpirePickerChange = false
  })
}

function onExpirePickerChange() {
  if (skipExpirePickerChange) return
  expireShortcut.value = ''
}

function toIsoExpiresAt(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

function openCreate() {
  form.value.username = ''
  form.value.password = ''
  form.value.role = isAppKind.value ? 'user' : 'admin'
  form.value.multiOpenCount = 1
  expireShortcut.value = '1d'
  form.value.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  dialogOpen.value = true
}

async function onSave() {
  if (!formRef.value) return
  const ok = await formRef.value.validate().then(
    () => true,
    () => false,
  )
  if (!ok) return

  saving.value = true
  try {
    await createAccount({
      username: String(form.value.username ?? '').trim(),
      password: String(form.value.password ?? ''),
      kind: accountKind.value,
      role: isAppKind.value ? 'user' : form.value.role,
      expiresAt: isAppKind.value ? toIsoExpiresAt(form.value.expiresAt) : undefined,
      multiOpenCount: isAppKind.value ? form.value.multiOpenCount : undefined,
    })
    dialogOpen.value = false
    await fetchList()
    ElMessage.success('账号已创建')
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || '创建失败'
    ElMessage.error(msg)
  } finally {
    saving.value = false
  }
}

async function onDelete(row) {
  const ok = await ElMessageBox.confirm(`删除账号：${row.username}？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  }).then(
    () => true,
    () => false,
  )
  if (!ok) return
  try {
    await deleteAccount(row.id)
    await fetchList()
    ElMessage.success('账号已删除')
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || '删除失败'
    ElMessage.error(msg)
  }
}

watch(accountKind, fetchList)
onMounted(fetchList)
</script>

<style scoped>
.actions-bar {
  margin: 12px 0;
}

.expire-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.expire-tag {
  cursor: pointer;
  user-select: none;
}
</style>
