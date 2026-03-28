const voiceBtn   = document.getElementById('voice-btn');
const voiceLabel = document.getElementById('voice-label');
const textInput  = document.getElementById('text-input');
const sendBtn    = document.getElementById('send-btn');
const responseEl = document.getElementById('response');

// ── Speech recognition setup ──────────────────────────────────────────────────
// Prefer webkit prefix — required on iOS Safari
const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    textInput.value = transcript;
    sendCommand(transcript);
  };

  recognition.onerror = (e) => {
    showResponse(`speech error: ${e.error}`, true);
    setVoiceIdle();
  };

  recognition.onend = () => {
    setVoiceIdle();
  };
} else {
  // Voice unavailable — disable button and surface message to user
  voiceBtn.disabled = true;
  voiceBtn.textContent = '🚫';
  voiceBtn.style.opacity = '0.35';
  voiceLabel.textContent = 'voice not supported — use text input';
}

// ── Voice button state helpers ────────────────────────────────────────────────
function setVoiceListening() {
  voiceBtn.classList.add('listening');
  voiceBtn.classList.remove('sent');
  voiceLabel.textContent = 'listening…';
}

function setVoiceSent() {
  voiceBtn.classList.remove('listening');
  voiceBtn.classList.add('sent');
  voiceLabel.textContent = 'sent';
  setTimeout(setVoiceIdle, 1000);
}

function setVoiceIdle() {
  voiceBtn.classList.remove('listening', 'sent');
  voiceLabel.textContent = 'hold to speak';
}

// ── Voice button events ───────────────────────────────────────────────────────
function startListening() {
  if (!recognition) return;
  try {
    recognition.start();
    setVoiceListening();
  } catch (_) {
    // already started — ignore
  }
}

function stopListening() {
  if (!recognition) return;
  recognition.stop();
}

voiceBtn.addEventListener('mousedown',  (e) => { e.preventDefault(); startListening(); });
voiceBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startListening(); }, { passive: false });
voiceBtn.addEventListener('mouseup',    stopListening);
voiceBtn.addEventListener('touchend',   stopListening);
voiceBtn.addEventListener('mouseleave', stopListening);

// ── Text send ─────────────────────────────────────────────────────────────────
sendBtn.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (text) sendCommand(text);
});

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const text = textInput.value.trim();
    if (text) sendCommand(text);
  }
});

// ── POST /command ─────────────────────────────────────────────────────────────
async function sendCommand(text) {
  showResponse('sending…');
  textInput.value = '';

  try {
    const res = await fetch('/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: text }),
    });

    const data = await res.json();
    showResponse(JSON.stringify(data, null, 2));
    setVoiceSent();
  } catch (err) {
    showResponse(`error: ${err.message}`, true);
    setVoiceIdle();
  }
}

// ── Display helpers ───────────────────────────────────────────────────────────
function showResponse(text, isError = false) {
  responseEl.textContent = text;
  responseEl.classList.remove('empty');
  responseEl.style.color = isError ? 'var(--danger)' : 'var(--text)';
}
