const serverUrlInput = document.getElementById('serverUrl');
const connectBtn = document.getElementById('connectBtn');
const errorMsg = document.getElementById('errorMsg');

function validateUrl(url) {
    if (!url) {
        showError('Please enter a server URL');
        return false;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showError('URL must start with http:// or https://');
        return false;
    }

    try {
        new URL(url);
    } catch {
        showError('Invalid URL format');
        return false;
    }

    hideError();
    return true;
}

function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
}

function hideError() {
    errorMsg.style.display = 'none';
}

connectBtn.addEventListener('click', async () => {
    const url = serverUrlInput.value.trim();
    
    if (validateUrl(url)) {
        await window.electronAPI.saveServerUrl(url);
        await window.electronAPI.openWebView(url);
    }
});

serverUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        connectBtn.click();
    }
});
