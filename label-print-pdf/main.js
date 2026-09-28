/**
 * 主进程：窗口管理 + IPC + 串行打印队列
 * 方案：hiprint 模板 → 隐藏窗口渲染 → printToPDF(矢量) → 平台打印适配器静默打印
 */
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const { renderTemplateToPdf } = require('./print/pdf')
const { printPdfSilently } = require('./print/dispatcher')

let mainWindow = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 760,
    backgroundColor: '#fff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'designer.html'))
}

/* ---------- 打印串行队列：一单打完再发下一单，避免批量把打印机队列打爆 ---------- */
let printChain = Promise.resolve()
function enqueue(task) {
  const run = printChain.then(task, task)
  printChain = run.catch(() => {}) // 队列本身不中断，错误由调用方处理
  return run
}

/* ---------- IPC ---------- */

ipcMain.handle('list-printers', () => mainWindow.webContents.getPrinters().map((p) => p.name))

ipcMain.handle('get-default-template', () =>
  fs.readFileSync(path.join(__dirname, 'template', 'label-template.json'), 'utf8')
)

/**
 * 生成 PDF 并静默打印
 * 参数: { templateJson, data, printer }
 */
ipcMain.handle('print-label', async (_e, { templateJson, data, printer }) => {
  return enqueue(async () => {
    let pdfPath = null
    try {
      pdfPath = await renderTemplateToPdf(templateJson, data)
      await printPdfSilently(pdfPath, printer)
      fs.rmSync(pdfPath, { force: true }) // 成功后清理临时 PDF
      return { ok: true, pdfPath: null }
    } catch (err) {
      // 失败时保留 PDF 便于排查（路径在错误信息里）
      return { ok: false, pdfPath, error: String(err && err.message ? err.message : err) }
    }
  })
})

/**
 * 仅导出 PDF（调试闭环：先放大检查文字/条码是否清晰，再上打印机）
 */
ipcMain.handle('export-label-pdf', async (_e, { templateJson, data }) => {
  const pdfPath = await renderTemplateToPdf(templateJson, data)
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `label-${Date.now()}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) {
    fs.rmSync(pdfPath, { force: true })
    return { ok: false, canceled: true }
  }
  fs.copyFileSync(pdfPath, filePath)
  fs.rmSync(pdfPath, { force: true })
  return { ok: true, pdfPath: filePath }
})

/* ---------- 生命周期 ---------- */
app.whenReady().then(createMainWindow)
app.on('window-all-closed', () => app.quit())
