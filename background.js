// Recibe mensajes del popup para reenviar a content scripts
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'updateFilter') {
    chrome.tabs.query({}, tabs => {
      for (let tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: 'applyFilter' });
      }
    });
  }
});