(function () {
  'use strict'

  var config = window.SAGEAID_DOWNLOAD_CONFIG || {}
  var apiBase = String(config.apiBase || '/api').replace(/\/$/, '') + '/'
  var apiRoot = new URL(apiBase, window.location.href)
  var button = document.getElementById('download-button')
  var label = document.getElementById('download-label')
  var error = document.getElementById('download-error')

  document.getElementById('year').textContent = String(new Date().getFullYear())

  function formatBytes(value) {
    var bytes = Number(value)
    if (!Number.isFinite(bytes) || bytes <= 0) return ''
    var units = ['B', 'KB', 'MB', 'GB']
    var index = 0
    while (bytes >= 1024 && index < units.length - 1) {
      bytes /= 1024
      index += 1
    }
    return bytes.toFixed(bytes >= 100 ? 0 : 1) + ' ' + units[index]
  }

  function formatDate(value) {
    var date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) + '更新'
  }

  function showRelease(release) {
    var version = 'v' + release.version
    var downloadUrl = new URL(release.downloadPath, apiRoot.origin).toString()
    button.href = downloadUrl
    button.classList.remove('is-loading')
    button.removeAttribute('aria-disabled')
    label.textContent = '下载 Windows 版 · ' + version
    document.getElementById('version').textContent = version
    document.getElementById('card-version').textContent = 'SageAid ' + version
    document.getElementById('file-name').textContent = release.fileName

    var size = formatBytes(release.sizeBytes)
    if (size) document.getElementById('file-size').textContent = size + ' · Windows 10 / 11 · 64 位'
    document.getElementById('release-date').textContent = formatDate(release.publishedAt || release.uploadedAt)

    if (release.releaseNotes) {
      document.getElementById('release-notes-text').textContent = release.releaseNotes
      document.getElementById('release-notes').hidden = false
    }
  }

  function showError() {
    label.textContent = '暂时无法下载'
    button.classList.remove('is-loading')
    button.setAttribute('aria-disabled', 'true')
    document.getElementById('version').textContent = '暂无已发布版本'
    document.getElementById('file-name').textContent = '请稍后再试'
    error.textContent = '下载服务暂时不可用，请稍后刷新页面。'
    error.hidden = false
  }

  fetch(new URL('releases/latest', apiRoot).toString(), { headers: { Accept: 'application/json' } })
    .then(function (response) {
      if (!response.ok) throw new Error('release unavailable')
      return response.json()
    })
    .then(showRelease)
    .catch(showError)
})()
