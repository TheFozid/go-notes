const webview = document.getElementById('webview');
const menuBtn = document.getElementById('menuBtn');
const menuPopup = document.getElementById('menuPopup');
const changeServerBtn = document.getElementById('changeServerBtn');
const connectionIndicator = document.getElementById('connectionIndicator');

let serverUrl = '';

window.electronAPI.onLoadUrl((url) => {
    serverUrl = url;
    webview.src = url;
});

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuPopup.classList.toggle('show');
});

document.addEventListener('click', () => {
    menuPopup.classList.remove('show');
});

changeServerBtn.addEventListener('click', async () => {
    await window.electronAPI.clearServerUrl();
    await window.electronAPI.openConfig();
});

function updateConnectionStatus() {
    if (navigator.onLine) {
        connectionIndicator.classList.remove('offline');
    } else {
        connectionIndicator.classList.add('offline');
    }
}

window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

updateConnectionStatus();
