<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="brand">SageAI Admin</div>
      <el-menu :default-active="active" router class="menu">
        <el-menu-item index="/logs">日志</el-menu-item>
        <el-menu-item index="/players">入池率</el-menu-item>
        <el-menu-item v-if="auth.isAdmin" index="/accounts">系统账号</el-menu-item>
        <el-menu-item v-if="auth.isAdmin" index="/admin-accounts">后台账号</el-menu-item>
        <el-menu-item v-if="auth.isAdmin" index="/preflop-ranges">翻前范围</el-menu-item>
        <el-menu-item v-if="auth.isAdmin" index="/ally-nicks">队友名单</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">{{ title }}</div>
        <div class="header-right">
          <span class="user" v-if="auth.username">{{ auth.username }}</span>
          <el-button size="small" @click="onLogout">退出登录</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const active = computed(() => route.path)
const title = computed(() => route.meta?.title || '控制台')

async function onLogout() {
  const ok = await ElMessageBox.confirm('确定退出登录？', '提示', {
    type: 'warning',
    confirmButtonText: '退出',
    cancelButtonText: '取消',
  }).then(
    () => true,
    () => false,
  )
  if (!ok) return
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.layout {
  height: 100vh;
}

.aside {
  border-right: 1px solid var(--el-border-color);
  background: #fff;
}

.brand {
  height: 59px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-weight: 700;
  border-bottom: 1px solid var(--el-border-color);
}

.menu {
  border-right: none;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color);
  background: #fff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user {
  color: var(--el-text-color-secondary);
}

.main {
  background: #f6f7fb;
}
</style>
