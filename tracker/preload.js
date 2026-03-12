// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getAllWindows: () => ipcRenderer.invoke("get-all-windows"),
  onAppUsageUpdate: (callback) => ipcRenderer.on("app-usage-update", callback),
});