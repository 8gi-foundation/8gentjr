import { loadTextToSpeech, loadVoiceStyle, writeWavFile } from './helper.js';

const HF = 'https://huggingface.co/Supertone/supertonic-3/resolve/main';
const ONNX_DIR = `${HF}/onnx`;
const VOICE_URL = (id) => `${HF}/voice_styles/${id}.json`;

const $ = (id) => document.getElementById(id);
const statusEl = $('status');
const badgeEl = $('badge');
const goBtn = $('go');
const voiceSel = $('voice');
const outEl = $('out');

let tts = null;
let style = null;
let currentVoiceId = 'M1';

function setStatus(msg, kind = '') {
  statusEl.textContent = msg;
  statusEl.className = kind;
}

async function init() {
  try {
    setStatus('Loading ONNX models from HuggingFace… (≈200 MB first run, then cached)');

    let provider = 'webgpu';
    let result;
    try {
      result = await loadTextToSpeech(ONNX_DIR, {
        executionProviders: ['webgpu'],
        graphOptimizationLevel: 'all',
      }, (name, i, n) => setStatus(`Loading model ${i}/${n}: ${name}`));
    } catch (gpuErr) {
      console.warn('WebGPU failed, falling back to WASM:', gpuErr);
      provider = 'wasm';
      result = await loadTextToSpeech(ONNX_DIR, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      }, (name, i, n) => setStatus(`Loading model ${i}/${n} (WASM): ${name}`));
    }
    tts = result.textToSpeech;
    badgeEl.textContent = provider;

    setStatus(`Loading voice ${currentVoiceId}…`);
    style = await loadVoiceStyle([VOICE_URL(currentVoiceId)], false);

    setStatus(`Ready (${provider}). Click "Generate speech".`, 'ok');
    goBtn.disabled = false;
  } catch (err) {
    console.error(err);
    setStatus(`Init failed: ${err.message}`, 'error');
  }
}

voiceSel.addEventListener('change', async (e) => {
  const id = e.target.value;
  if (id === currentVoiceId) return;
  goBtn.disabled = true;
  setStatus(`Loading voice ${id}…`);
  try {
    style = await loadVoiceStyle([VOICE_URL(id)], false);
    currentVoiceId = id;
    setStatus(`Voice ${id} loaded.`, 'ok');
  } catch (err) {
    setStatus(`Voice load failed: ${err.message}`, 'error');
  } finally {
    goBtn.disabled = false;
  }
});

goBtn.addEventListener('click', async () => {
  const text = $('text').value.trim();
  if (!text) return setStatus('Enter some text first.', 'error');
  if (!tts || !style) return setStatus('Models not ready.', 'error');

  goBtn.disabled = true;
  const t0 = performance.now();
  try {
    setStatus('Synthesizing…');
    const steps = parseInt($('steps').value, 10);
    const speed = parseFloat($('speed').value);
    const lang = $('lang').value;

    const { wav, duration } = await tts.call(
      text, lang, style, steps, speed, 0.3,
      (s, n) => setStatus(`Denoising ${s}/${n}…`)
    );

    const sr = tts.sampleRate;
    const sliced = wav.slice(0, Math.floor(sr * duration[0]));
    const buf = writeWavFile(sliced, sr);
    const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));

    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    const audioLen = duration[0].toFixed(2);
    const rtf = (elapsed / parseFloat(audioLen)).toFixed(2);

    outEl.innerHTML = `
      <audio controls autoplay src="${url}"></audio>
      <div class="stats">
        <span>Audio: ${audioLen}s</span>
        <span>Gen: ${elapsed}s</span>
        <span>RTF: ${rtf}×</span>
        <a href="${url}" download="supertonic.wav">Download WAV</a>
      </div>`;
    setStatus(`Done in ${elapsed}s (RTF ${rtf}×).`, 'ok');
  } catch (err) {
    console.error(err);
    setStatus(`Synthesis failed: ${err.message}`, 'error');
  } finally {
    goBtn.disabled = false;
  }
});

init();
