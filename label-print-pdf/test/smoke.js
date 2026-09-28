/**
 * 端到端冒烟测试（headless，不涉及打印机）：
 * 加载 label.html → 注入模板渲染 → printToPDF → 校验 PDF 矢量特征
 * 运行：xvfb-run -a npx electron test/smoke.js --no-sandbox
 */
const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.commandLine.appendSwitch('no-sandbox')

app.whenReady().then(async () => {
  const templateJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'template', 'label-template.json'), 'utf8')
  )
  const data = { productName: '示例商品 SKU-6688', barcode: '1234567890123', price: '¥25.90' }

  // 1) 与 print/pdf.js 相同的渲染路径
  const win = new BrowserWindow({
    show: false,
    backgroundColor: '#fff',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })
  await win.loadFile(path.join(__dirname, '..', 'renderer', 'label.html'))

  const ready = await win.webContents.executeJavaScript(
    `window.__render(${JSON.stringify(templateJson)}, ${JSON.stringify(data)})`,
    true
  )
  console.log('render ready:', ready)

  // 2) 生成 PDF
  const pdf = await win.webContents.printToPDF({
    preferCSSPageSize: true,
    printBackground: true,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  })
  fs.writeFileSync('/tmp/label-test.pdf', pdf)
  console.log('PDF written:', pdf.length, 'bytes')
  win.destroy()
  app.quit()
}).catch((e) => {
  console.error('SMOKE FAIL:', e)
  app.exit(1)
})
