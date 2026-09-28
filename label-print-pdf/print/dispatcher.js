/**
 * PDF → 打印机：平台分发
 *  - Windows: pdf-to-printer（内核 SumatraPDF，按打印机原生分辨率渲染后发送，标签机友好）
 *  - macOS/Linux: unix-print（CUPS lp，原生支持 PDF 矢量）
 *
 * 两个包都只在对应平台分支 require，跨平台安装互不影响。
 */
const os = require('os')

async function printPdfSilently(pdfPath, printerName) {
  if (process.platform === 'win32') {
    const { print } = require('pdf-to-printer')
    const options = {
      silent: true,
      scale: 'noscale', // 关键：禁缩放，任何缩放 = 糊 + 偏移
    }
    if (printerName) options.printer = printerName
    return print(pdfPath, options)
  }

  const { print } = require('unix-print')
  // unix-print: print(file, printer?) → lp -d <printer> file.pdf（printer 为空则用默认打印机）
  return print(pdfPath, printerName || undefined)
}

module.exports = { printPdfSilently }
