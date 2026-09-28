/**
 * HTML → PDF：隐藏窗口加载 label.html，注入 hiprint 模板与数据，
 * 等字体就绪后 printToPDF（矢量文字 + 内嵌字体）。
 *
 * 关键点（对应方案 checklist）：
 * 1. 隐藏窗口必须设不透明 backgroundColor（否则次像素 AA 失效、文字发虚）
 * 2. preferCSSPageSize + label.html 的 @page size(mm) → 纸张与标签物理尺寸一致
 * 3. margins 全 0，printBackground 开
 * 4. 渲染侧等 document.fonts.ready 再返回，避免回退字体进 PDF
 */
const { BrowserWindow, app } = require('electron')
const path = require('path')
const fs = require('fs')

async function renderTemplateToPdf(templateJson, data) {
  const win = new BrowserWindow({
    show: false,
    backgroundColor: '#fff', // 不透明背景
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  try {
    await win.loadFile(path.join(__dirname, '..', 'renderer', 'label.html'))

    // __render 返回 Promise：hiprint 渲染 + fonts.ready 后 resolve
    const inject = `window.__render(${JSON.stringify(templateJson)}, ${JSON.stringify(data || {})})`
    await win.webContents.executeJavaScript(inject, true)

    const pdfBuffer = await win.webContents.printToPDF({
      preferCSSPageSize: true, // 用 @page size: 40mm 30mm 作为纸张尺寸
      printBackground: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    })

    const pdfPath = path.join(app.getPath('temp'), `label-${Date.now()}.pdf`)
    fs.writeFileSync(pdfPath, pdfBuffer)
    return pdfPath
  } finally {
    win.destroy() // 用完即毁，不留隐藏窗口
  }
}

module.exports = { renderTemplateToPdf }
