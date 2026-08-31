<template>
  <el-card shadow="never">
    <el-form :inline="true" @submit.prevent>
      <el-form-item label="筛选">
        <el-input v-model="keyword" placeholder="按昵称筛选" clearable style="width: 240px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="fetchList">刷新</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <div class="actions-bar">
    <el-button type="success" @click="openCreate">新增队友昵称</el-button>
  </div>

  <el-card shadow="never" style="margin-top: 12px">
    <el-table :data="filteredItems" v-loading="loading" stripe>
      <el-table-column prop="nickname" label="昵称" min-width="260" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">修改</el-button>
          <el-button size="small" type="danger" plain @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="dialogOpen" :title="dialogMode === 'edit' ? '修改队友昵称' : '新增队友昵称'" width="460px">
    <el-form ref="formRef" :model="form" label-position="top">
      <el-form-item label="昵称" prop="nickname" :rules="[{ required: true, message: '请输入昵称', trigger: 'blur' }]">
        <el-input v-model="form.nickname" placeholder="nickname" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogOpen = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addAllyNick, deleteAllyNick, getAllyNicks, updateAllyNick } from '../api/allyNicks'

const loading = ref(false)
const saving = ref(false)
const items = ref([])
const keyword = ref('')

const dialogOpen = ref(false)
const dialogMode = ref('create')
const formRef = ref()
const form = ref({
  nickname: '',
  oldNickname: '',
})

const filteredItems = computed(() => {
  const key = String(keyword.value ?? '').trim()
  if (!key) return items.value
  return items.value.filter((it) => it.nickname.includes(key))
})

async function fetchList() {
  loading.value = true
  try {
    const res = await getAllyNicks()
    const list = Array.isArray(res?.items) ? res.items : []
    items.value = list.map((nickname) => ({ nickname }))
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || '获取失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogMode.value = 'create'
  form.value.nickname = ''
  form.value.oldNickname = ''
  dialogOpen.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value.nickname = row.nickname
  form.value.oldNickname = row.nickname
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
    const nickname = String(form.value.nickname ?? '').trim()
    if (dialogMode.value === 'edit') {
      await updateAllyNick(form.value.oldNickname, nickname)
    } else {
      await addAllyNick(nickname)
    }
    dialogOpen.value = false
    await fetchList()
    ElMessage.success('已保存')
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || '保存失败'
    ElMessage.error(msg)
  } finally {
    saving.value = false
  }
}

async function onDelete(row) {
  const ok = await ElMessageBox.confirm(`删除队友昵称：${row.nickname}？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  }).then(
    () => true,
    () => false,
  )
  if (!ok) return
  try {
    await deleteAllyNick(row.nickname)
    await fetchList()
    ElMessage.success('已删除')
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || '删除失败'
    ElMessage.error(msg)
  }
}

onMounted(fetchList)
</script>

<style scoped>
.actions-bar {
  margin: 12px 0;
}
</style>

