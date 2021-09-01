const { app, BrowserWindow, session, ipcMain } = require('electron');
const fs = require('fs');
const url = require("url");
const path = require("path");

const dataPath = path.join(__dirname, "data");
const songsDataPath = path.join(dataPath, "songsData.json");

let mainWindow

ipcMain.on("request-mainprocess-cookies", (event, arg) => {
    session.defaultSession.cookies.get({})
        .then(cookies => {
            event.sender.send("mainprocess-cookies-retrieved", cookies);
        });
});

ipcMain.on("request-mainprocess-file-write", (event, arg) => {
    fs.writeFileSync(path.join(dataPath, arg.fileName), new Buffer.from(arg.data));
    event.sender.send("mainprocess-file-written", arg);
});

ipcMain.on("request-mainprocess-file-delete", (event, arg) => {
    if (fs.existsSync(path.join(dataPath, arg))) {
        fs.rmSync(path.join(dataPath, arg));
    }
    event.sender.send("mainprocess-file-deleted", arg);
});

ipcMain.on("request-mainprocess-song-data", (event, arg) => {
    let config = fs.readFileSync(songsDataPath, {
        encoding: "utf-8"
    });
    event.sender.send("mainprocess-song-data-read", JSON.parse(config));
});

ipcMain.on("request-mainprocess-song-data-update", (event, arg) => {
    fs.writeFileSync(songsDataPath, JSON.stringify(arg));
    event.sender.send("mainprocess-song-data-updated", {});
});

function createWindow() {
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath);
    }
    if (!fs.existsSync(songsDataPath)) {
        fs.writeFileSync(songsDataPath, JSON.stringify({
            songs: [],
            volume: 0.5
        }));
    }
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.setIcon(path.join(__dirname, "orange.png"));

    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, `./dist/index.html`),
            protocol: "file:",
            slashes: true
        }), {
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36"
        }
    );
    mainWindow.on('closed', function() {
        mainWindow = null
    })
}
console.log(app);
app.on('ready', createWindow)

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function() {
    if (mainWindow === null) createWindow()
})