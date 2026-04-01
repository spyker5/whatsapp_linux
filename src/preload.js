const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopShell", {
  reload: () => ipcRenderer.send("app:reload")
});

contextBridge.exposeInMainWorld("desktopSettings", {
  getSettings: () => ipcRenderer.invoke("app:get-settings"),
  setOpenAtLogin: (enabled) => ipcRenderer.invoke("app:set-open-at-login", enabled)
});
