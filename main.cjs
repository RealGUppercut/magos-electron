// main Electron process – handles window creation, protocol registration, and filesystem IPC
const { app, BrowserWindow, dialog, ipcMain, protocol } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

// create the main browser window once the app is ready
app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"), // preload script for exposing IPC APIs
      contextIsolation: true, // keep app and Electron APIs separate
      nodeIntegration: false, // prevent using require in renderer
      webSecurity: false, // disables CORS so we can load local files (like STL/image previews)
    },
  });

  // load local dev server or packaged HTML
  const isDev = !app.isPackaged;
  const startURL = isDev
    ? "http://localhost:5173"
    : `file://${path
        .join(__dirname, "dist", "index.html")
        .replace(/\\/g, "/")}`;

  mainWindow.loadURL(startURL);
  mainWindow.webContents.openDevTools(); // opens console on launch

  // register custom file:// handler so we can preview local files safely
  protocol.registerFileProtocol("safe-file", (request, callback) => {
    let filePath = request.url.replace("safe-file://", "");
    filePath = decodeURIComponent(filePath);

    // windows-style path fix
    if (process.platform === "win32") {
      filePath = filePath.replace(/\//g, "\\");
    }

    const fullPath = path.resolve(filePath);

    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      callback({ error: -6 }); // -6 is ERR_FILE_NOT_FOUND
    } else {
      callback({ path: fullPath });
    }
  });
});

// open file picker dialog (multiple files allowed)
ipcMain.handle("select-files", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
  });
  return result.filePaths || [];
});

// open folder picker dialog
ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return result.filePaths[0] || null;
});

// moves a file from one path to another (used in batch operation)
ipcMain.handle("rename-move-file", async (event, { oldPath, newPath }) => {
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ensures a folder exists at the target path (used to create subfolders)
ipcMain.handle("ensure-folder", async (event, pathToCreate) => {
  try {
    if (!fs.existsSync(pathToCreate)) {
      fs.mkdirSync(pathToCreate, { recursive: true });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
