const freqRange = document.getElementById('freqRange');
const freqValue = document.getElementById('freqValue');
const toggleFilter = document.getElementById('toggleFilter');
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
  freqRange.style.background = `linear-gradient(to right, #0a84ff 0%, #0a84ff ${percent}%, #d1d1d6 ${percent}%, #d1d1d6 100%)`;
}

// Inicializa valores
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['cutoffPos', 'filterOn'], ({ cutoffPos = 500, filterOn }) => {
    freqRange.value = cutoffPos;
    const freq = posToFreq(cutoffPos);
    freqValue.textContent = `${freq} Hz`;
    toggleFilter.checked = !!filterOn;
    updateSliderBackground(cutoffPos);
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