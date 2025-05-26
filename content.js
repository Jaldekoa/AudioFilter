let audioContext = null;
let filterNode = null;
let stereoPannerNode = null;
let mediaElementSources = new Map();

// Función principal para configurar el procesamiento de audio
async function setupAudioProcessing() {
  try {
    const settings = await chrome.storage.local.get(['cutoffFreq', 'filterOn', 'panValue']);
    const { filterOn = false, cutoffFreq = 20000, panValue = 0 } = settings;

    if (!filterOn) {
      await teardownAudioProcessing();
      return;
    }

    // Configurar AudioContext si es necesario
    if (!audioContext || audioContext.state === 'closed') {
      if (audioContext) await teardownAudioProcessing();
      audioContext = new AudioContext();
    }

    // Asegurar que el AudioContext esté activo
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Configurar nodos de audio si es necesario
    if (!filterNode) {
      filterNode = audioContext.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.connect(audioContext.destination);
    }

    if (!stereoPannerNode) {
      stereoPannerNode = audioContext.createStereoPanner();
      filterNode.disconnect();
      filterNode.connect(stereoPannerNode);
      stereoPannerNode.connect(audioContext.destination);
    }

    // Actualizar valores del filtro
    filterNode.frequency.setValueAtTime(cutoffFreq, audioContext.currentTime);
    stereoPannerNode.pan.setValueAtTime(panValue / 100, audioContext.currentTime);

    // Conectar elementos multimedia
    connectAllMediaElements();

  } catch (error) {
    console.error('Error en setupAudioProcessing:', error);
    await teardownAudioProcessing();
  }
}

// Función para conectar todos los elementos multimedia
function connectAllMediaElements() {
  document.querySelectorAll('video, audio').forEach(mediaElement => {
    if (mediaElement.readyState >= 2) {
      connectMediaToFilter(mediaElement);
    } else {
      mediaElement.addEventListener('canplay', () => connectMediaToFilter(mediaElement), { once: true });
    }
  });
}

// Función para conectar un elemento multimedia al filtro
function connectMediaToFilter(mediaElement) {
  if (!audioContext || !filterNode || !stereoPannerNode || !mediaElement) return;

  try {
    if (mediaElementSources.has(mediaElement)) {
      const sourceNode = mediaElementSources.get(mediaElement);
      sourceNode.disconnect();
      sourceNode.connect(filterNode);
    } else {
      const sourceNode = audioContext.createMediaElementSource(mediaElement);
      mediaElementSources.set(mediaElement, sourceNode);
      sourceNode.connect(filterNode);

      // Configurar eventos del elemento multimedia
      setupMediaElementEvents(mediaElement);
    }
  } catch (error) {
    console.error('Error al conectar elemento multimedia:', error);
  }
}

// Función para configurar eventos de elementos multimedia
function setupMediaElementEvents(mediaElement) {
  const handlePlay = async () => {
    if (audioContext?.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (e) {
        console.error("Error al reanudar AudioContext:", e);
      }
    }
  };

  mediaElement.addEventListener('play', handlePlay);
  mediaElement.addEventListener('pause', () => {
    if (audioContext?.state === 'running') {
      audioContext.suspend().catch(e => console.error("Error al suspender AudioContext:", e));
    }
  });

  // Manejar eventos de pantalla completa
  ['webkitbeginfullscreen', 'webkitendfullscreen', 'fullscreenchange'].forEach(event => {
    mediaElement.addEventListener(event, handlePlay);
  });
}

// Función para limpiar el procesamiento de audio
async function teardownAudioProcessing() {
  try {
    // Desconectar todas las fuentes
    mediaElementSources.forEach(sourceNode => {
      try {
        sourceNode.disconnect();
      } catch (e) {
        console.error("Error al desconectar fuente:", e);
      }
    });
    mediaElementSources.clear();

    // Limpiar nodos de audio
    if (filterNode) {
      try {
        filterNode.disconnect();
      } catch (e) {}
      filterNode = null;
    }

    if (stereoPannerNode) {
      try {
        stereoPannerNode.disconnect();
      } catch (e) {}
      stereoPannerNode = null;
    }

    // Cerrar AudioContext solo si existe y no está cerrado
    if (audioContext && audioContext.state && audioContext.state !== 'closed') {
      try {
        await audioContext.close();
      } catch (error) {
        console.error('Error al cerrar AudioContext:', error);
      }
    }
    audioContext = null;

    // Restaurar reproducción
    document.querySelectorAll('video, audio').forEach(mediaElement => {
      if (mediaElement.readyState >= 2 && !mediaElement.paused) {
        mediaElement.pause();
        setTimeout(() => {
          mediaElement.play().catch(e => console.error("Error al reanudar reproducción:", e));
        }, 100);
      }
    });
  } catch (error) {
    console.error('Error en teardownAudioProcessing:', error);
  }
}

// Observador para elementos multimedia dinámicos
const mediaObserver = new MutationObserver(mutations => {
  if (!filterNode || !audioContext || audioContext.state === 'closed') return;

  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const mediaElements = [];
          if (node.matches('video, audio')) mediaElements.push(node);
          mediaElements.push(...Array.from(node.querySelectorAll('video, audio')));
          
          mediaElements.forEach(mediaEl => {
            if (!mediaElementSources.has(mediaEl)) {
              connectMediaToFilter(mediaEl);
            }
          });
        }
      });

      mutation.removedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const mediaElements = [];
          if (node.matches('video, audio')) mediaElements.push(node);
          mediaElements.push(...Array.from(node.querySelectorAll('video, audio')));
          
          mediaElements.forEach(mediaEl => {
            if (mediaElementSources.has(mediaEl)) {
              const source = mediaElementSources.get(mediaEl);
              source.disconnect();
              mediaElementSources.delete(mediaEl);
            }
          });
        }
      });
    }
  });
});

// Inicialización
async function init() {
  await setupAudioProcessing();
  
  mediaObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'applyFilter' || message.type === 'updateFilter') {
      setupAudioProcessing()
        .then(() => sendResponse?.({ status: 'success' }))
        .catch(error => sendResponse?.({ status: 'error', error: error.message }));
      return true;
    }
  });

  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && (changes.filterOn || changes.cutoffFreq || changes.panValue)) {
      await setupAudioProcessing();
    }
  });
}

init();