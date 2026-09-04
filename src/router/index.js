import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import LogsView from '../views/LogsView.vue'
import PlayersView from '../views/PlayersView.vue'
import AllyNicksView from '../views/AllyNicksView.vue'
import AccountsView from '../views/AccountsView.vue'
import PreflopRangesView from '../views/PreflopRangesView.vue'
import InstallerPackagesView from '../views/InstallerPackagesView.vue'
import { useAuthStore } from '../stores/auth'

function tokenKind() {
  const token = localStorage.getItem('sageaid_admin_token') || ''
  const parts = token.split('.')
  if (parts.length < 2) return ''
  try {
    const base = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base.padEnd(base.length + ((4 - (base.length % 4)) % 4), '=')
    return String(JSON.parse(atob(padded))?.kind || '')
  } catch {
    return ''
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
    {
      path: '/',
      component: AdminLayout,
      children: [
        { path: '', redirect: '/logs' },
        { path: 'logs', name: 'logs', component: LogsView, meta: { title: '日志' } },
        { path: 'players', name: 'players', component: PlayersView, meta: { title: '玩家画像' } },
        {
          path: 'preflop-ranges',
          name: 'preflop-ranges',
          component: PreflopRangesView,
          meta: { title: '翻前范围', admin: true },
        },
        {
          path: 'ally-nicks',
          name: 'ally-nicks',
          component: AllyNicksView,
          meta: { title: '队友名单', admin: true },
        },
        {
          path: 'accounts',
          name: 'accounts',
          component: AccountsView,
          meta: { title: '系统账号', admin: true, accountKind: 'app' },
        },
        {
          path: 'admin-accounts',
          name: 'admin-accounts',
          component: AccountsView,
          meta: { title: '后台账号', admin: true, accountKind: 'admin' },
        },
        {
          path: 'installer-packages',
          name: 'installer-packages',
          component: InstallerPackagesView,
          meta: { title: '安装包管理', admin: true },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/logs' },
  ],
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  const token = localStorage.getItem('sageaid_admin_token')
  if (!token) return { name: 'login', query: { redirect: to.fullPath } }
  if (tokenKind() === 'app') {
    localStorage.removeItem('sageaid_admin_token')
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.admin) {
    const auth = useAuthStore()
    if (!auth.isAdmin) return { name: 'logs' }
  }
  return true
})

export default router

