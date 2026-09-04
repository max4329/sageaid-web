import { http } from "./http";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function listInstallerPackages() {
  const { data } = await http.get("/installer-packages");
  return data;
}

export async function uploadInstallerPackage(payload, onProgress) {
  const form = new FormData();
  form.append("version", payload.version);
  form.append("releaseNotes", payload.releaseNotes || "");
  form.append(
    "publishAfterUpload",
    String(Boolean(payload.publishAfterUpload)),
  );
  form.append("file", payload.file);

  const { data } = await http.post("/installer-packages/upload", form, {
    timeout: 0,
    onUploadProgress(event) {
      if (!event.total) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    },
  });
  return data;
}

export async function publishInstallerPackage(id) {
  const { data } = await http.post(`/installer-packages/${id}/publish`);
  return data;
}

export async function deleteInstallerPackage(id) {
  const { data } = await http.delete(`/installer-packages/${id}`);
  return data;
}

export function installerDownloadUrl(id) {
  const base = String(API_BASE).replace(/\/$/, "");
  return new URL(
    `${base}/releases/${id}/download`,
    window.location.origin,
  ).toString();
}
