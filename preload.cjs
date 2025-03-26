// exposes backend functions to the renderer via contextBridge
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  // triggers system file picker and returns selected file paths
  selectFiles: () => ipcRenderer.invoke("select-files"),

  // triggers system folder picker and returns selected directory path
  selectFolder: () => ipcRenderer.invoke("select-folder"),

  // renames and moves a file from old path to new path
  renameMoveFile: (oldPath, newPath) =>
    ipcRenderer.invoke("rename-move-file", { oldPath, newPath }),

  // triggers a preview action for images
  previewImage: (filePath) => ipcRenderer.send("preview-image", filePath),

  // makes sure a folder exists at the given path, creates it if not
  ensureFolder: (path) => ipcRenderer.invoke("ensure-folder", path),
});
