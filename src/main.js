const path = require("path");
const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Notification,
  Tray,
  nativeImage,
  shell,
  session
} = require("electron");

const WHATSAPP_URL = "https://web.whatsapp.com/";
const ICON_PATH = path.join(__dirname, "..", "assets", "icon.png");
const WHATSAPP_HOSTS = ["https://web.whatsapp.com/*", "https://*.whatsapp.net/*"];
const CHROME_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

let mainWindow;
let tray;
let isQuitting = false;

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function loadWhatsApp(targetWindow = mainWindow) {
  if (!targetWindow) {
    return;
  }

  targetWindow.webContents.setUserAgent(CHROME_USER_AGENT);
  targetWindow.loadURL(WHATSAPP_URL, {
    userAgent: CHROME_USER_AGENT,
    httpReferrer: "https://web.whatsapp.com/"
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#111b21",
    autoHideMenuBar: false,
    title: "WhatsApp Linux",
    icon: ICON_PATH,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: true
    }
  });

  loadWhatsApp();

  mainWindow.once("ready-to-show", () => {
    if (process.argv.includes("--start-minimized")) {
      return;
    }

    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(WHATSAPP_URL)) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-fail-load", () => {
    mainWindow.loadFile(path.join(__dirname, "loading.html"));
  });

  mainWindow.webContents.on("page-title-updated", (event, title) => {
    event.preventDefault();
    mainWindow.setTitle(title.includes("WhatsApp") ? title : `WhatsApp Linux - ${title}`);
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(WHATSAPP_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow.hide();
  });
}

function setupPermissions() {
  const ses = session.defaultSession;

  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = new Set([
      "media",
      "mediaKeySystem",
      "notifications",
      "fullscreen"
    ]);

    callback(allowedPermissions.has(permission));
  });

  ses.setPermissionCheckHandler((_webContents, permission) => {
    const allowedPermissions = new Set([
      "media",
      "mediaKeySystem",
      "notifications",
      "fullscreen"
    ]);

    return allowedPermissions.has(permission);
  });

  ses.webRequest.onHeadersReceived((details, callback) => {
    const headers = {
      ...details.responseHeaders,
      "Permissions-Policy": [
        "camera=(self), microphone=(self), fullscreen=(self), display-capture=(self)"
      ]
    };

    callback({ responseHeaders: headers });
  });

  ses.webRequest.onBeforeSendHeaders({ urls: WHATSAPP_HOSTS }, (details, callback) => {
    const requestHeaders = {
      ...details.requestHeaders,
      "User-Agent": CHROME_USER_AGENT
    };

    delete requestHeaders["Sec-CH-UA"];
    delete requestHeaders["Sec-CH-UA-Mobile"];
    delete requestHeaders["Sec-CH-UA-Platform"];
    delete requestHeaders["sec-ch-ua"];
    delete requestHeaders["sec-ch-ua-mobile"];
    delete requestHeaders["sec-ch-ua-platform"];

    callback({ requestHeaders });
  });
}

function buildMenu() {
  const loginSettings = app.getLoginItemSettings();

  const template = [
    {
      label: "Aplicativo",
      submenu: [
        {
          label: "Mostrar janela",
          accelerator: "CmdOrCtrl+Shift+W",
          click: () => showMainWindow()
        },
        {
          label: "Recarregar WhatsApp",
          accelerator: "CmdOrCtrl+R",
          click: () => loadWhatsApp()
        },
        {
          label: "Forcar recarga",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => mainWindow?.webContents.reloadIgnoringCache()
        },
        {
          label: "Iniciar com o sistema",
          type: "checkbox",
          checked: loginSettings.openAtLogin,
          click: (menuItem) => {
            app.setLoginItemSettings({
              openAtLogin: menuItem.checked,
              openAsHidden: true,
              args: ["--start-minimized"]
            });
          }
        },
        { type: "separator" },
        {
          label: "Sair",
          role: "quit"
        }
      ]
    },
    {
      label: "Editar",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "Visualizar",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupNotifications() {
  app.on("web-contents-created", (_event, contents) => {
    contents.on("notification-show", () => {
      if (!Notification.isSupported()) {
        return;
      }
    });
  });
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(ICON_PATH).resize({ width: 20, height: 20 });
  tray = new Tray(trayIcon);
  tray.setToolTip("WhatsApp Linux");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Abrir WhatsApp",
        click: () => showMainWindow()
      },
      {
        label: "Recarregar",
        click: () => loadWhatsApp()
      },
      { type: "separator" },
      {
        label: "Sair",
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ])
  );

  tray.on("click", () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
      return;
    }

    showMainWindow();
  });
}

function setupAutoLaunch() {
  app.setLoginItemSettings({
    openAtLogin: false,
    openAsHidden: true,
    args: ["--start-minimized"]
  });
}

function setupIpc() {
  ipcMain.on("app:reload", () => {
    loadWhatsApp();
  });

  ipcMain.handle("app:get-settings", () => {
    const { openAtLogin } = app.getLoginItemSettings();
    return { openAtLogin };
  });

  ipcMain.handle("app:set-open-at-login", (_event, enabled) => {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      openAsHidden: true,
      args: ["--start-minimized"]
    });

    return { openAtLogin: Boolean(enabled) };
  });
}

if (gotSingleInstanceLock) {
  app.on("second-instance", () => {
    showMainWindow();
  });

  app.whenReady().then(() => {
    setupPermissions();
    setupAutoLaunch();
    setupIpc();
    buildMenu();
    setupNotifications();
    createWindow();
    createTray();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        showMainWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});
