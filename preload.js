const { ipcRenderer } = require('electron');
const path = require("path");

window.ipcRenderer = ipcRenderer;
window.dataPath = path.join(__dirname, "data");