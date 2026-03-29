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
    listening = false;
    const transcript = e.results[0][0].transcript;
    textInput.value = transcript;
    sendCommand(transcript);
  };

  recognition.onerror = (e) => {
    listening = false;
    showResponse(`speech error: ${e.error}`, true);
    setVoiceIdle();
  };

  recognition.onend = () => {
    listening = false;
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
  voiceLabel.textContent = 'TAP TO STOP';
}

function setVoiceSent() {
  voiceBtn.classList.remove('listening');
  voiceBtn.classList.add('sent');
  voiceLabel.textContent = 'SENT';
  setTimeout(setVoiceIdle, 1000);
}

function setVoiceIdle() {
  voiceBtn.classList.remove('listening', 'sent');
  voiceLabel.textContent = 'TAP TO SPEAK';
}

// ── Voice button toggle ───────────────────────────────────────────────────────
let listening = false;

voiceBtn.addEventListener('click', () => {
  if (!recognition) return;
  if (!listening) {
    listening = true;
    recognition.start();
    setVoiceListening();
  } else {
    listening = false;
    recognition.stop();
    setVoiceIdle();
  }
});

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
