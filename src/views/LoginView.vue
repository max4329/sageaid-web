<template>
  <div class="wrap">
    <div class="shell">
      <section class="brand">
        <div class="brand-mark">D</div>
        <h1>SageAI Admin</h1>
        <p class="brand-desc">德扑助手内部管理系统</p>
        <ul class="brand-points">
          <li>日志审计</li>
          <li>账号与权限</li>
          <li>策略配置</li>
        </ul>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>登录</h2>
          <p>请使用后台账号继续</p>
        </div>

        <el-form :model="form" class="form" @keyup.enter="onSubmit">
          <el-form-item>
            <el-input
              v-model="form.username"
              size="large"
              placeholder="后台账号"
              autocomplete="username"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="form.password"
              size="large"
              type="password"
              placeholder="密码"
              autocomplete="current-password"
              show-password
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <div class="puzzle" :style="{ width: puzzle.width + 'px' }">
              <div class="puzzle-board" :class="{ success: verified }" :style="{ height: puzzle.height + 'px' }">
                <img v-if="puzzle.background" class="puzzle-bg" :src="puzzle.background" alt="" />
                <img
                  v-if="puzzle.piece"
                  class="puzzle-piece"
                  :src="puzzle.piece"
                  alt=""
                  :style="{
                    left: offsetX - puzzle.padLeft + 'px',
                    top: puzzle.pieceY - puzzle.padTop + 'px',
                  }"
                />
                <button class="refresh" type="button" title="刷新验证" @click="loadCaptcha">
                  <el-icon :size="14"><RefreshRight /></el-icon>
                </button>
              </div>
              <div
                class="slider"
                :class="{ success: verified, fail: failed, dragging }"
                @pointerdown="onPointerDown"
              >
                <div
                  class="slider-track"
                  :style="{ width: offsetX + puzzle.pieceSize + 'px' }"
                />
                <div
                  class="slider-handle"
                  :style="{ left: offsetX + 'px', width: puzzle.pieceSize + 'px' }"
                >
                  <span class="chevrons">››</span>
                </div>
                <span v-if="!verified" class="slider-hint">向右滑动填充拼图</span>
                <span v-else class="slider-hint success-text">验证成功</span>
              </div>
            </div>
          </el-form-item>
          <el-button
            type="primary"
            size="large"
            class="submit"
            :loading="auth.loading"
            @click="onSubmit"
          >
            登录
          </el-button>
        </el-form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, RefreshRight, User } from '@element-plus/icons-vue'
import { getCaptcha, verifyCaptcha } from '../api/auth'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const puzzle = reactive({
  captchaId: '',
  background: '',
  piece: '',
  width: 360,
  height: 160,
  pieceSize: 36,
  pieceY: 40,
  padLeft: 2,
  padTop: 2,
})
const offsetX = ref(0)
const verified = ref(false)
const failed = ref(false)
const ticket = ref('')
const dragging = ref(false)
const startClientX = ref(0)
const startOffset = ref(0)

const form = reactive({
  username: auth.username || '',
  password: '',
})

const maxOffset = () => Math.max(0, Number(puzzle.width || 360) - Number(puzzle.pieceSize || 36))

async function loadCaptcha() {
  verified.value = false
  failed.value = false
  ticket.value = ''
  offsetX.value = 0
  try {
    const res = await getCaptcha()
    puzzle.captchaId = res?.captchaId || ''
    puzzle.background = res?.background || ''
    puzzle.piece = res?.piece || ''
    puzzle.width = Number(res?.width) || 360
    puzzle.height = Number(res?.height) || 160
    puzzle.pieceSize = Number(res?.pieceSize) || 36
    puzzle.pieceY = Number(res?.pieceY) || 40
    puzzle.padLeft = Number(res?.padLeft) || 2
    puzzle.padTop = Number(res?.padTop) || 2
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || '获取验证失败'
    ElMessage.error(msg)
  }
}

function onPointerDown(event) {
  if (verified.value || auth.loading) return
  dragging.value = true
  startClientX.value = event.clientX
  startOffset.value = offsetX.value
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(event) {
  if (!dragging.value) return
  const next = startOffset.value + (event.clientX - startClientX.value)
  offsetX.value = Math.min(maxOffset(), Math.max(0, next))
}

async function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  try {
    const res = await verifyCaptcha({
      captchaId: puzzle.captchaId,
      offsetX: Math.round(offsetX.value),
    })
    ticket.value = res?.ticket || ''
    verified.value = true
    failed.value = false
  } catch (e) {
    failed.value = true
    const msg = e?.response?.data?.message || e?.message || '滑动验证失败'
    ElMessage.error(msg)
    if (String(msg).includes('刷新')) {
      await loadCaptcha()
      return
    }
    offsetX.value = 0
    setTimeout(() => {
      failed.value = false
    }, 400)
  }
}

async function onSubmit() {
  if (!form.username.trim() || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  if (!verified.value || !ticket.value) {
    ElMessage.warning('请先完成滑动验证')
    return
  }
  try {
    await auth.login({
      username: form.username.trim(),
      password: form.password,
      captchaId: puzzle.captchaId,
      captchaTicket: ticket.value,
    })
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/logs'
    router.replace(redirect)
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || '登录失败'
    ElMessage.error(msg)
    await loadCaptcha()
  }
}

onMounted(loadCaptcha)
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<style scoped>
.wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  background:
    radial-gradient(1200px 500px at 12% -10%, rgba(59, 130, 246, 0.18), transparent 55%),
    radial-gradient(900px 420px at 100% 110%, rgba(15, 118, 110, 0.16), transparent 50%),
    #eef2f7;
}

.shell {
  width: 860px;
  max-width: 100%;
  display: grid;
  grid-template-columns: 1.05fr 1.15fr;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.12),
    0 0 0 1px rgba(15, 23, 42, 0.04);
}

.brand {
  position: relative;
  padding: 48px 40px;
  color: #e2e8f0;
  background:
    radial-gradient(420px 240px at 80% 0%, rgba(59, 130, 246, 0.28), transparent 60%),
    radial-gradient(320px 200px at 0% 100%, rgba(20, 184, 166, 0.18), transparent 55%),
    #0f172a;
  overflow: hidden;
}

.brand::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.5), transparent 85%);
  pointer-events: none;
}

.brand-mark,
.brand h1,
.brand-desc,
.brand-points {
  position: relative;
}

.brand-mark {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(180deg, #3b82f6, #2563eb);
  color: #fff;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.04em;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.35);
}

.brand h1 {
  margin: 28px 0 8px;
  font-size: 28px;
  line-height: 1.2;
  color: #fff;
  font-weight: 700;
}

.brand-desc {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
}

.brand-points {
  margin: 40px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
  color: #cbd5e1;
  font-size: 13px;
}

.brand-points li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-points li::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #60a5fa;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.16);
}

.panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 40px;
}

.panel-head,
.form {
  width: 360px;
  max-width: 100%;
}

.panel-head h2 {
  margin: 0 0 6px;
  font-size: 24px;
  color: #0f172a;
}

.panel-head p {
  margin: 0 0 28px;
  color: #64748b;
  font-size: 13px;
}

.form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.form :deep(.el-input__wrapper) {
  border-radius: 10px;
}

.submit {
  width: 100%;
  margin-top: 8px;
  border-radius: 10px;
  font-weight: 600;
}

.puzzle {
  user-select: none;
}

.puzzle-board {
  position: relative;
  overflow: hidden;
  border-radius: 4px;
  background: #9aa3af;
}

.puzzle-board.success {
  box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.45);
}

.puzzle-bg,
.puzzle-piece {
  display: block;
}

.puzzle-piece {
  position: absolute;
  pointer-events: none;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.28));
}

.refresh {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.28);
  color: #fff;
  cursor: pointer;
}

.refresh:hover {
  background: rgba(255, 255, 255, 0.45);
}

.slider {
  position: relative;
  height: 32px;
  margin-top: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  background: #f7f8fa;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}

.slider.dragging {
  cursor: grabbing;
}

.slider.success {
  border-color: #bbf7d0;
  background: #f0fdf4;
  cursor: default;
}

.slider.fail {
  border-color: #fecaca;
  background: #fef2f2;
}

.slider-track {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: #e8f1fb;
}

.slider.success .slider-track {
  background: #dcfce7;
}

.slider-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  box-shadow: 0 0 3px rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  z-index: 1;
}

.slider.success .slider-handle {
  color: #22c55e;
  border-right-color: #bbf7d0;
}

.chevrons {
  font-size: 16px;
  letter-spacing: -4px;
  line-height: 1;
  padding-right: 4px;
}

.slider-hint {
  position: absolute;
  inset: 0 0 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 12px;
  pointer-events: none;
}

.success-text {
  color: #86efac;
}

@media (max-width: 800px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .brand {
    display: none;
  }

  .panel {
    padding: 32px 20px;
  }
}
</style>
