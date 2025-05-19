let audioContext, filterNode;

// Crea o actualiza el filtro según settings
async function applyFilter() {
  const { cutoffFreq = 2000, filterOn = false } = await chrome.storage.local.get(['cutoffFreq', 'filterOn']);
  
  // Si no quiere filtro, desconectar y limpiar
  if (!filterOn) {
    disconnectFilter();
    return;
  }

  // Simplemente reiniciar contexto si no existe
  if (!audioContext) {
    audioContext = new AudioContext();
    document.querySelectorAll('video, audio').forEach(media => {
      const src = audioContext.createMediaElementSource(media);
      filterNode = audioContext.createBiquadFilter();
      filterNode.type = 'lowpass';
      src.connect(filterNode).connect(audioContext.destination);
      media.addEventListener('play', () => audioContext.resume());
    });
  }

  // Actualizar frecuencia de corte
  filterNode.frequency.setValueAtTime(cutoffFreq, audioContext.currentTime);
}

function disconnectFilter() {
  if (filterNode) {
    filterNode.disconnect();
    filterNode = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

// Al recibir mensaje, aplicar cambios
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'applyFilter') {
    applyFilter();
  }
});

// Inyectar al cargar página
applyFilter();