const freqRange = document.getElementById('freqRange');
const freqValue = document.getElementById('freqValue');
const toggleFilter = document.getElementById('toggleFilter');
const panRange = document.getElementById('panRange');
const panValue = document.getElementById('panValue');
const MIN_FREQ = 20;
const MAX_FREQ = 20000;

// Convierte posición lineal [0,1000] a frecuencia logarítmica
function posToFreq(pos) {
  const ratio = pos / 1000;
  return Math.round(MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, ratio));
}

// Actualiza el fondo del slider
function updateSliderBackground(pos) {
  const percent = (pos / 1000) * 100;
  freqRange.style.background = `linear-gradient(90deg, #4776E6, #8E54E9)`;
}

// Inicializa valores
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['cutoffPos', 'filterOn', 'panValue'], ({ cutoffPos = 1000, filterOn, panValue: storedPan = 0 }) => {
    freqRange.value = cutoffPos;
    const freq = posToFreq(cutoffPos);
    freqValue.textContent = `${freq} Hz`;
    toggleFilter.checked = !!filterOn;
    updateSliderBackground(cutoffPos);
    
    // Inicializar panoramización
    panRange.value = storedPan;
    updatePanValue(storedPan);
  });
});

// Evento de cambio en slider
freqRange.addEventListener('input', () => {
  const pos = Number(freqRange.value);
  const freq = posToFreq(pos);
  freqValue.textContent = `${freq} Hz`;
  chrome.storage.local.set({ cutoffPos: pos, cutoffFreq: freq });
  updateSliderBackground(pos);
  chrome.runtime.sendMessage({ type: 'updateFilter' });
});

// Toggle on/off
toggleFilter.addEventListener('change', () => {
  chrome.storage.local.set({ filterOn: toggleFilter.checked });
  chrome.runtime.sendMessage({ type: 'updateFilter' });
});

// Función para actualizar el valor de panoramización
function updatePanValue(value) {
  panValue.textContent = value;
}

// Evento de cambio en slider de panoramización
panRange.addEventListener('input', () => {
  const value = Number(panRange.value);
  updatePanValue(value);
  chrome.storage.local.set({ panValue: value });
  chrome.runtime.sendMessage({ type: 'updateFilter' });
});