<template>
  <div class="packages-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-title">上传 Windows 安装包</div>
            <div class="card-subtitle">
              支持 .exe 和 .msi，文件将保存到服务器安装包目录。
            </div>
          </div>
        </div>
      </template>

      <el-form label-position="top" class="upload-form" @submit.prevent>
        <el-form-item label="版本号" required>
          <el-input
            v-model="form.version"
            placeholder="例如 2.1.0"
            maxlength="64"
          />
        </el-form-item>
        <el-form-item label="安装包" required>
          <input
            ref="fileInput"
            type="file"
            accept=".exe,.msi"
            :disabled="uploading"
            @change="onFileChange"
          />
          <div v-if="selectedFile" class="file-meta">
            {{ selectedFile.name }} · {{ formatBytes(selectedFile.size) }}
          </div>
        </el-form-item>
        <el-form-item label="更新说明">
          <el-input
            v-model="form.releaseNotes"
            type="textarea"
            :rows="3"
            maxlength="4000"
            show-word-limit
            placeholder="可选，简要说明本次更新内容"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.publishAfterUpload"
            >上传完成后立即设为官网当前版本</el-checkbox
          >
        </el-form-item>

        <div v-if="uploading" class="progress-block">
          <el-progress
            :percentage="uploadProgress"
            :status="uploadProgress === 100 ? 'success' : undefined"
          />
          <span>{{ uploadStage }}</span>
        </div>

        <el-button type="primary" :loading="uploading" @click="onUpload"
          >上传安装包</el-button
        >
      </el-form>
    </el-card>

    <el-card shadow="never" class="list-card">
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-title">安装包版本</div>
            <div class="card-subtitle">
              官网只展示标记为“当前版本”的安装包。
            </div>
          </div>
          <el-button :loading="loading" @click="fetchPackages">刷新</el-button>
        </div>
      </template>

      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column prop="version" label="版本" width="120" />
        <el-table-column
          prop="fileName"
          label="文件名"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column label="大小" width="110">
          <template #default="{ row }">{{
            formatBytes(row.sizeBytes)
          }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.isPublished" type="success">当前版本</el-tag>
            <el-tag v-else-if="row.status === 'ready'" type="info"
              >已上传</el-tag
            >
            <el-tag v-else type="warning">待完成</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上传时间" min-width="170">
          <template #default="{ row }">{{
            formatDate(row.uploadedAt || row.createdAt)
          }}</template>
        </el-table-column>
        <el-table-column label="操作" width="245" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'ready' && !row.isPublished"
              size="small"
              type="primary"
              plain
              @click="onPublish(row)"
            >
              设为当前版本
            </el-button>
            <el-button
              v-if="row.isPublished"
              size="small"
              @click="onDownload(row)"
              >下载测试</el-button
            >
            <el-button
              v-if="!row.isPublished"
              size="small"
              type="danger"
              plain
              @click="onDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="还没有上传安装包" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  deleteInstallerPackage,
  installerDownloadUrl,
  listInstallerPackages,
  publishInstallerPackage,
  uploadInstallerPackage,
} from "../api/installerPackages";

const fileInput = ref(null);
const selectedFile = ref(null);
const items = ref([]);
const loading = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadStage = ref("");

const form = reactive({
  version: "",
  releaseNotes: "",
  publishAfterUpload: true,
});

function errorMessage(error, fallback) {
  const message = error?.response?.data?.message;
  return Array.isArray(message)
    ? message.join("；")
    : message || error?.message || fallback;
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("zh-CN", { hour12: false });
}

function onFileChange(event) {
  const file = event.target?.files?.[0] || null;
  selectedFile.value = file;
  if (!file) return;
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (![".exe", ".msi"].includes(extension)) {
    selectedFile.value = null;
    event.target.value = "";
    ElMessage.error("仅支持 .exe 或 .msi 安装包");
  }
}

async function fetchPackages() {
  loading.value = true;
  try {
    const result = await listInstallerPackages();
    items.value = Array.isArray(result?.items) ? result.items : [];
  } catch (error) {
    ElMessage.error(errorMessage(error, "获取安装包列表失败"));
  } finally {
    loading.value = false;
  }
}

async function onUpload() {
  const file = selectedFile.value;
  if (!String(form.version).trim()) {
    ElMessage.warning("请填写版本号");
    return;
  }
  if (!file) {
    ElMessage.warning("请选择 Windows 安装包");
    return;
  }

  uploading.value = true;
  uploadProgress.value = 0;
  uploadStage.value = "正在准备上传…";
  try {
    uploadStage.value = "正在上传到服务器…";
    await uploadInstallerPackage(
      {
        version: form.version.trim(),
        releaseNotes: form.releaseNotes.trim(),
        publishAfterUpload: form.publishAfterUpload,
        file,
      },
      (progress) => {
        uploadProgress.value = progress;
        if (progress === 100) uploadStage.value = "正在校验并保存安装包…";
      },
    );

    ElMessage.success(
      form.publishAfterUpload ? "安装包已上传并发布" : "安装包上传成功",
    );
    form.version = "";
    form.releaseNotes = "";
    selectedFile.value = null;
    if (fileInput.value) fileInput.value.value = "";
    await fetchPackages();
  } catch (error) {
    ElMessage.error(errorMessage(error, "安装包上传失败"));
    await fetchPackages();
  } finally {
    uploading.value = false;
    uploadStage.value = "";
  }
}

async function onPublish(row) {
  const confirmed = await ElMessageBox.confirm(
    `确定把 v${row.version} 设为官网当前下载版本吗？`,
    "发布安装包",
    { type: "warning", confirmButtonText: "发布", cancelButtonText: "取消" },
  ).then(
    () => true,
    () => false,
  );
  if (!confirmed) return;
  try {
    await publishInstallerPackage(row.id);
    ElMessage.success("当前下载版本已更新");
    await fetchPackages();
  } catch (error) {
    ElMessage.error(errorMessage(error, "发布失败"));
  }
}

async function onDelete(row) {
  const confirmed = await ElMessageBox.confirm(
    `删除 ${row.fileName}？服务器磁盘中的文件也会一并删除。`,
    "删除安装包",
    { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" },
  ).then(
    () => true,
    () => false,
  );
  if (!confirmed) return;
  try {
    await deleteInstallerPackage(row.id);
    ElMessage.success("安装包已删除");
    await fetchPackages();
  } catch (error) {
    ElMessage.error(errorMessage(error, "删除失败"));
  }
}

function onDownload(row) {
  window.open(installerDownloadUrl(row.id), "_blank", "noopener");
}

onMounted(fetchPackages);
</script>

<style scoped>
.packages-page {
  display: grid;
  gap: 16px;
}
.upload-form {
  max-width: 680px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
}
.card-subtitle,
.file-meta,
.progress-block span {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.card-subtitle {
  margin-top: 4px;
}
.file-meta {
  margin-top: 8px;
}
.list-card {
  min-width: 0;
}
.progress-block {
  display: grid;
  gap: 6px;
  margin-bottom: 18px;
}
</style>
