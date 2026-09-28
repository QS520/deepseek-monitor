const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  listPrinters: () => ipcRenderer.invoke('list-printers'),
  getDefaultTemplate: () => ipcRenderer.invoke('get-default-template'),
  printLabel: (payload) => ipcRenderer.invoke('print-label', payload),
  exportLabelPdf: (payload) => ipcRenderer.invoke('export-label-pdf', payload),
})
