const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  selectFiles: () => ipcRenderer.invoke("select-files"),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  renameMoveFile: (oldPath, newPath) =>
    ipcRenderer.invoke("rename-move-file", { oldPath, newPath }),
  previewImage: (filePath) => ipcRenderer.send("preview-image", filePath),
});
