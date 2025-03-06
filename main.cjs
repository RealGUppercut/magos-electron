const { app, BrowserWindow, dialog, ipcMain, protocol } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startURL = "http://localhost:5173";
  mainWindow.loadURL(startURL);
  mainWindow.webContents.openDevTools();

  protocol.registerFileProtocol("safe-file", (request, callback) => {
    let filePath = request.url.replace("safe-file://", "");
    filePath = decodeURIComponent(filePath);

    if (process.platform === "win32") {
      filePath = filePath.replace(/\//g, "\\");
    }

    const fullPath = path.resolve(filePath);

    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      callback({ error: -6 });
    } else {
      callback({ path: fullPath });
    }
  });
});

ipcMain.handle("select-files", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
  });
  return result.filePaths || [];
});

ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return result.filePaths[0] || null;
});

ipcMain.handle("rename-move-file", async (event, { oldPath, newPath }) => {
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
