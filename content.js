let audioContext = null;
let filterNode = null;
let mediaElementSources = new Map(); // Almacena HTMLMediaElement -> MediaElementAudioSourceNode

// Ayudante para conectar un único elemento multimedia al filtro
function connectMediaToFilter(mediaElement) {
  if (!audioContext || !filterNode || !mediaElement) return;

  // Verifica si el mediaElement ya está siendo procesado por un AudioContext diferente
  // Esto es una heurística, ya que no hay una forma directa de comprobarlo.
  // Si mediaElement.srcObject es un MediaStream proveniente de otro AudioContext, podríamos tener problemas.
  // Sin embargo, para createMediaElementSource, el elemento en sí es la fuente.

  if (mediaElementSources.has(mediaElement)) {
    // El elemento ya tiene una fuente, asegúrate de que esté conectada correctamente
    const sourceNode = mediaElementSources.get(mediaElement);
    try {
      sourceNode.disconnect(); // Desconectar de conexiones previas
    } catch (e) { /* Podría no haber estado conectado */ }
    try {
      sourceNode.connect(filterNode);
    } catch (e) {
      console.error('Error al reconectar la fuente existente al filtro:', e, mediaElement);
      // Si la reconexión falla (p.ej., contexto incorrecto), intenta recrear la fuente.
      mediaElementSources.delete(mediaElement); // Eliminar la fuente antigua
      recreateAndConnectSource(mediaElement);
    }
  } else {
    // Nuevo elemento, crear fuente y conectar
    recreateAndConnectSource(mediaElement);
  }
}

function recreateAndConnectSource(mediaElement) {
  if (!audioContext || !filterNode) return;
  try {
    const sourceNode = audioContext.createMediaElementSource(mediaElement);
    mediaElementSources.set(mediaElement, sourceNode);
    sourceNode.connect(filterNode);
    // Reanudar AudioContext al reproducir, si estaba suspendido (p.ej., por políticas de autoplay)
    mediaElement.addEventListener('play', () => {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(e => console.error("Error al reanudar AudioContext en play:", e));
      }
    });
  } catch (error) {
    console.error('Error al crear o conectar la fuente multimedia para:', mediaElement.src || mediaElement.id, error);
  }
}


// Crear o actualizar el filtro
async function setupAudioProcessing() {
  const settings = await chrome.storage.local.get(['cutoffFreq', 'filterOn']);
  const filterOn = settings.filterOn !== undefined ? settings.filterOn : false;
  const cutoffFreq = settings.cutoffFreq !== undefined ? settings.cutoffFreq : 20000;

  if (!filterOn) {
    teardownAudioProcessing();
    return;
  }

  // El filtro está ACTIVADO
  if (!audioContext || audioContext.state === 'closed') {
    try {
      // Si había un contexto previo, asegurarse de que esté completamente limpio
      if (audioContext) await teardownAudioProcessing();
      audioContext = new AudioContext();
      // Manejar cambios de estado de AudioContext (p.ej., para autoplay)
      audioContext.onstatechange = () => {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().catch(e => console.error("Error al reanudar AudioContext en statechange:", e));
        }
      };
    } catch (error) {
      console.error('Fallo al crear AudioContext:', error);
      await teardownAudioProcessing(); // Limpiar si la creación del contexto falla
      return;
    }
  }

  // Reanudar si está suspendido
  if (audioContext.state === 'suspended') {
    await audioContext.resume().catch(e => console.error("Error al reanudar AudioContext:", e));
  }

  if (!filterNode) {
    filterNode = audioContext.createBiquadFilter();
    filterNode.type = 'lowpass';
    // Conectar el filtro al destino UNA VEZ cuando se crea
    filterNode.connect(audioContext.destination);
  }

  // Asegurarse de que la frecuencia se actualice incluso si el nodo ya existía
  filterNode.frequency.setValueAtTime(cutoffFreq, audioContext.currentTime);

  // Procesar todos los elementos multimedia actuales
  document.querySelectorAll('video, audio').forEach(mediaElement => connectMediaToFilter(mediaElement));
  // (MutationObserver manejará elementos añadidos dinámicamente)
}

// Limpiar nodos de procesamiento de audio y contexto
async function teardownAudioProcessing() {
  // Desconectar todas las fuentes del filtro
  mediaElementSources.forEach((sourceNode) => {
    try {
      sourceNode.disconnect();
    } catch (e) { /* ignorar */ }
  });
  mediaElementSources.clear(); // Las fuentes son inválidas después de que el contexto se cierra

  if (filterNode) {
    try {
      filterNode.disconnect(); // Desconectar del destino y de cualquier fuente conectada
    } catch (e) { /* ignorar */ }
    filterNode = null;
  }

  if (audioContext && audioContext.state !== 'closed') {
    try {
      await audioContext.close();
      console.log('AudioContext cerrado.');
    } catch (error) {
      console.error('Error al cerrar AudioContext:', error);
    } finally {
      audioContext = null;
    }
  } else {
    audioContext = null; // Asegurarse de que sea null si ya estaba cerrado o no existía
  }
}

// Observador para elementos multimedia añadidos/eliminados dinámicamente
const mediaObserver = new MutationObserver((mutationsList) => {
  // Solo actuar si el filtro se supone que está activo
  // Comprobamos filterNode porque audioContext podría existir brevemente durante el teardown
  if (!filterNode || !audioContext || audioContext.state === 'closed') {
    return;
  }
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const elementsToProcess = [];
          if (node.matches('video, audio')) {
            elementsToProcess.push(node);
          }
          // También buscar dentro del nodo añadido
          elementsToProcess.push(...Array.from(node.querySelectorAll('video, audio')));
          
          elementsToProcess.forEach(mediaEl => {
            // Solo procesar si no tiene ya una fuente o si la fuente es de un contexto diferente (heurística)
            if (!mediaElementSources.has(mediaEl)) {
                 connectMediaToFilter(mediaEl);
            }
          });
        }
      });
      // Manejar nodos eliminados para limpiar el mapa mediaElementSources
      mutation.removedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const elementsToRemove = [];
          if (node.matches('video, audio')) {
            elementsToRemove.push(node);
          }
          elementsToRemove.push(...Array.from(node.querySelectorAll('video, audio')));
          
          elementsToRemove.forEach(mediaEl => {
            if (mediaElementSources.has(mediaEl)) {
              const source = mediaElementSources.get(mediaEl);
              try { source.disconnect(); } catch(e) {/* ignorar */}
              mediaElementSources.delete(mediaEl);
            }
          });
        }
      });
    }
  }
});

// Configuración inicial y listener de mensajes
async function init() {
  // Aplicar filtro al cargar, basado en la configuración guardada
  await setupAudioProcessing(); 

  // Observar el documento para elementos multimedia añadidos o eliminados
  mediaObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'applyFilter') {
      setupAudioProcessing().then(() => {
        sendResponse({ status: 'Actualización del filtro procesada' });
      }).catch(error => {
        console.error("Error al procesar applyFilter:", error);
        sendResponse({ status: 'Error al procesar filtro', error: error.message });
      });
      return true; // Mantener el canal de mensajes abierto para la respuesta asíncrona
    }
  });
}

init();