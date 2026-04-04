// ═══════════════ STATE ═══════════════
let authMode = 'login';
let user = null;
let quizData = {};
let sessions = [];
let currentSession = null;
let pendingFiles = []; // {type, name, dataUrl}
let aiTyping = false;

const AI_EMOJIS = ['🤖','🌟','✨','💜','🦋','🌸','🔮','💫','🌈','🎭'];

/** Optional: set window.__ANTHROPIC_API_KEY before this script loads. Browser calls may still hit CORS; a backend proxy is safer. */
function getAnthropicKey() {
  return typeof window !== 'undefined' && window.__ANTHROPIC_API_KEY
    ? String(window.__ANTHROPIC_API_KEY).trim()
    : '';
}

function offlineAiReply(userText) {
  const ai = quizData.aiName || 'AI';
  const nick = quizData.userNick || (user && user.name) || 'there';
  const blob = (userText + ' ' + (quizData.charsSelf || '')).toLowerCase();
  if (blob.includes('arabic')) return "Wallah I get you 😭 but listen, you got this fr.";
  if (blob.includes('aave')) return "I feel you fr, like that's real life. You gon be alright though.";
  if (!getAnthropicKey()) {
    return `Hey ${nick}… ${ai} here in offline demo mode (no API key). I hear you — tell me more about that.\n\nSet window.__ANTHROPIC_API_KEY for Claude, or use a server proxy (recommended).`;
  }
  return `Hey ${nick}… ${ai} here — I couldn't reach the API just now. Tell me more about what you meant: "${userText.slice(0, 120)}${userText.length > 120 ? '…' : ''}"`;
}

// ═══════════════ MODAL ═══════════════
function openModal(mode) {
  authMode = mode;
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('modal-title');
  const sub = document.getElementById('modal-sub');
  const submit = document.getElementById('auth-submit');
  const sw = document.getElementById('auth-switch');
  const nameF = document.getElementById('auth-name-field');

  if (mode === 'login') {
    title.textContent = 'Welcome back';
    sub.textContent = 'Sign in to your account.';
    submit.textContent = 'Sign in';
    sw.innerHTML = `Don't have an account? <a onclick="openModal('signup')">Sign up free</a>`;
    nameF.style.display = 'none';
  } else {
    title.textContent = 'Create account';
    sub.textContent = 'Join and meet your AI companion.';
    submit.textContent = 'Sign up';
    sw.innerHTML = `Already have an account? <a onclick="openModal('login')">Sign in</a>`;
    nameF.style.display = '';
  }
  modal.classList.add('open');
}
function closeModal() { document.getElementById('auth-modal').classList.remove('open'); }
function closeModalBg(e) { if (e.target === document.getElementById('auth-modal')) closeModal(); }

function submitAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const pw = document.getElementById('auth-pw').value;
  const name = document.getElementById('auth-name').value.trim();
  const err = document.getElementById('auth-err');

  if (!email || !pw || (authMode === 'signup' && !name)) {
    err.style.display = 'block'; return;
  }
  err.style.display = 'none';

  if (authMode === 'signup') {
    user = { email, name };
  } else {
    const saved = localStorage.getItem('aura_u_' + email);
    user = saved ? JSON.parse(saved) : { email, name: email.split('@')[0] };
  }
  localStorage.setItem('aura_u_' + email, JSON.stringify(user));
  closeModal();

  // Check if profile exists
  const savedProfile = localStorage.getItem('aura_profile_' + email);
  if (savedProfile) {
    quizData = JSON.parse(savedProfile);
    loadSessions();
    launchApp();
  } else {
    goQ(1);
  }
}

function googleSignIn() {
  // Simulated Google sign-in
  const name = prompt('Google Sign-In (Demo)\n\nEnter your name:');
  const email = prompt('Enter your email:');
  if (!name || !email) return;
  user = { email: email.trim(), name: name.trim(), googleUser: true };
  localStorage.setItem('aura_u_' + email.trim(), JSON.stringify(user));
  closeModal();

  const savedProfile = localStorage.getItem('aura_profile_' + email.trim());
  if (savedProfile) {
    quizData = JSON.parse(savedProfile);
    loadSessions();
    launchApp();
  } else {
    goQ(1);
  }
}

// ═══════════════ QUIZ NAV ═══════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    if (s.id === id) { s.classList.remove('hidden'); s.style.display = ''; }
    else { s.classList.add('hidden'); if (s.id === 'app') s.style.display = 'none'; }
  });
}

function goQ(n) {
  if (n === 2) {
    const name = quizData.aiName || document.getElementById('ai-name-input').value.trim();
    if (!name) { alert('Please give your AI a name!'); return; }
    quizData.aiName = name;
    document.getElementById('q2-ai-label').textContent = name;
  }
  if (n === 3) {
    const nick = quizData.userNick || document.getElementById('user-nick-input').value.trim();
    if (!nick) { alert('Please enter what your AI should call you!'); return; }
    quizData.userNick = nick;
  }
  showScreen('q' + n);
}

function selectQ3(btn) {
  document.querySelectorAll('#q3-opts .quiz-opt-row').forEach(b => {
    b.classList.remove('selected');
    b.querySelector('.opt-dot').classList.remove('filled');
  });
  btn.classList.add('selected');
  btn.querySelector('.opt-dot').classList.add('filled');
  quizData.purpose = btn.dataset.val;
}

function finishQuiz() {
  quizData.charsWanted = document.getElementById('char-want').value.trim();
  quizData.charsSelf = document.getElementById('char-self').value.trim();
  localStorage.setItem('aura_profile_' + user.email, JSON.stringify(quizData));
  loadSessions();
  launchApp();
}

// ═══════════════ APP LAUNCH ═══════════════
function launchApp() {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.add('hidden'); s.style.display = '';
  });
  const app = document.getElementById('app');
  app.classList.remove('hidden'); app.style.display = 'flex';

  updateSidebar();
  updateHeader();
  if (!currentSession) newChat(true);
  updateWelcome();
}

function updateSidebar() {
  const initials = (user.name || user.email).charAt(0).toUpperCase();
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('sidebar-uname').textContent = user.name || user.email;
  document.getElementById('sidebar-uemail').textContent = user.email;
}

function updateHeader() {
  const aiName = quizData.aiName || 'AI';
  document.getElementById('header-ai-name').textContent = aiName;
  document.getElementById('header-avatar').textContent = getAiEmoji();
}

function getAiEmoji() {
  const n = (quizData.aiName || 'AI').length;
  return AI_EMOJIS[n % AI_EMOJIS.length];
}

function updateWelcome() {
  const aiName = quizData.aiName || 'AI';
  const nick = quizData.userNick || user.name;
  const greeting = getGreeting();
  document.getElementById('welcome-title').textContent = `${greeting}, ${nick}! 👋`;
  document.getElementById('welcome-sub').textContent = `I'm ${aiName}. ${getWelcomeLine()}`;
  document.getElementById('welcome-icon').textContent = getAiEmoji();

  const chips = document.getElementById('starter-chips');
  chips.innerHTML = '';
  getChips().forEach(c => {
    const ch = document.createElement('button');
    ch.className = 'chip'; ch.textContent = c;
    ch.onclick = () => { document.getElementById('msg-box').value = c; sendMsg(); };
    chips.appendChild(ch);
  });
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function getWelcomeLine() {
  const lines = {
    friend: "I'm here to chat, listen, and be your companion.",
    assist: "Ready to help with anything you need.",
    other: "What's on your mind today?",
  };
  return lines[quizData.purpose] || "What's on your mind today?";
}

function getChips() {
  if (quizData.purpose === 'assist') return ["Help me write something", "Explain a concept", "Brainstorm ideas", "Summarize this for me"];
  if (quizData.purpose === 'friend') return ["Tell me something fun", "I need to vent", "Cheer me up", "Play a game with me"];
  return ["What can you do?", "Tell me about yourself", "Let's chat!", "Give me a fun fact"];
}

// ═══════════════ SESSIONS ═══════════════
function loadSessions() {
  const s = localStorage.getItem('aura_sessions_' + user.email);
  sessions = s ? JSON.parse(s) : [];
  renderHistory();
}
function saveSessions() { localStorage.setItem('aura_sessions_' + user.email, JSON.stringify(sessions)); }

function newChat(silent = false) {
  const s = { id: Date.now(), title: 'New chat', messages: [], ts: Date.now() };
  sessions.unshift(s); currentSession = s;
  saveSessions(); renderHistory(); clearChat();
  if (!silent) updateWelcome();
}

function switchSession(id) {
  currentSession = sessions.find(s => s.id === id);
  clearChat();
  if (currentSession.messages.length === 0) {
    updateWelcome();
  } else {
    document.getElementById('welcome-center').style.display = 'none';
    currentSession.messages.forEach(m => renderBubble(m.role, m.content, m.imageUrl, false));
  }
  renderHistory();
}

function renderHistory() {
  const hist = document.getElementById('sidebar-history');
  hist.innerHTML = '<div class="history-label">Recent</div>';
  sessions.slice(0, 25).forEach(s => {
    const d = document.createElement('div');
    d.className = 'history-item' + (currentSession && s.id === currentSession.id ? ' active' : '');
    d.textContent = s.title;
    d.onclick = () => switchSession(s.id);
    hist.appendChild(d);
  });
}

function clearChat() {
  const wrap = document.getElementById('messages-wrap');
  wrap.innerHTML = `<div class="welcome-center" id="welcome-center">
    <div class="welcome-ai-big" id="welcome-icon">${getAiEmoji()}</div>
    <div class="welcome-title-chat" id="welcome-title">Hi!</div>
    <div class="welcome-sub-chat" id="welcome-sub"></div>
    <div class="starter-chips" id="starter-chips"></div>
  </div>`;
  updateWelcome();
}

// ═══════════════ MESSAGING ═══════════════
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
}
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

async function sendMsg() {
  const box = document.getElementById('msg-box');
  const text = box.value.trim();
  if ((!text && pendingFiles.length === 0) || aiTyping) return;

  // Hide welcome
  const wc = document.getElementById('welcome-center');
  if (wc) wc.style.display = 'none';

  // Render user message
  const imageUrl = pendingFiles.find(f => f.type === 'image')?.dataUrl || null;
  const docName = pendingFiles.find(f => f.type === 'doc')?.name || null;
  const displayText = text + (docName ? `\n📄 ${docName}` : '');

  addMessage('user', displayText || '📎 File attached', imageUrl);
  box.value = ''; box.style.height = 'auto';
  pendingFiles = []; renderFilePreviews();

  if (currentSession.messages.length === 1) {
    currentSession.title = (text || 'File').slice(0, 36) + (text.length > 36 ? '…' : '');
    renderHistory();
  }

  aiTyping = true;
  document.getElementById('send-btn').disabled = true;
  const typing = showTyping();
  scrollBottom();

  // Build API messages
  const apiMsgs = currentSession.messages.slice(0, -1).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

  // Add current with image if any
  if (imageUrl) {
    const b64 = imageUrl.split(',')[1];
    const mime = imageUrl.split(';')[0].split(':')[1];
    apiMsgs.push({ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
      { type: 'text', text: text || 'What do you see in this image?' }
    ]});
  } else {
    apiMsgs.push({ role: 'user', content: text || 'I sent a file.' });
  }

  const apiKey = getAnthropicKey();

  try {
    if (!apiKey) {
      await new Promise((r) => setTimeout(r, 450 + Math.random() * 350));
      typing.remove();
      addMessage('ai', offlineAiReply(text), null);
    } else {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildSystem(),
          messages: apiMsgs,
        }),
      });
      const data = await resp.json();
      typing.remove();
      if (!resp.ok) {
        addMessage('ai', offlineAiReply(text), null);
      } else {
        const aiReply =
          data.content?.map((c) => c.text || '').join('') || "I couldn't respond. Try again!";
        addMessage('ai', aiReply, null);
      }
    }
  } catch (e) {
    typing.remove();
    addMessage('ai', offlineAiReply(text), null);
  }

  aiTyping = false;
  document.getElementById('send-btn').disabled = false;
  saveSessions(); scrollBottom();
}

function buildSystem() {
  const aiName = quizData.aiName || 'AI';
  const nick = quizData.userNick || user.name;
  const chars = quizData.charsWanted || 'friendly, helpful';
  const self = quizData.charsSelf || '';
  const purpose = { friend: 'casual conversation and emotional support', assist: 'tasks and productivity', other: 'general assistance' }[quizData.purpose] || 'general assistance';

  return `You are ${aiName}, a personal AI companion for ${nick}.

Your personality traits: ${chars}.
What the user wants from you: ${purpose}.
About the user: ${self || 'No additional info provided.'}

Rules:
- Address the user as "${nick}" occasionally but naturally
- Sound like a real friend texting, not a robot
- No bullet points unless asked — talk in natural paragraphs
- Don't start with "Of course!" or "Certainly!" — just respond naturally
- Keep replies conversational length unless a detailed answer is needed
- If analyzing an image, describe what you see vividly and helpfully
- You can search or discuss any topic the user brings up`;
}

function addMessage(role, content, imageUrl = null) {
  currentSession.messages.push({ role, content, imageUrl, ts: Date.now() });
  renderBubble(role, content, imageUrl, true);
}

function renderBubble(role, content, imageUrl = null, animate = true) {
  const wrap = document.getElementById('messages-wrap');
  const row = document.createElement('div');
  row.className = `msg-row ${role === 'user' ? 'user' : 'ai'}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (!animate) bubble.style.animation = 'none';

  // Escape and format text
  let html = escHtml(content).replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
  bubble.innerHTML = html;

  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    bubble.appendChild(img);
  }

  row.appendChild(bubble);
  wrap.appendChild(row);
  scrollBottom();
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showTyping() {
  const wrap = document.getElementById('messages-wrap');
  const row = document.createElement('div');
  row.className = 'msg-row ai';
  row.innerHTML = `<div class="bubble typing-bubble"><div class="t-dot"></div><div class="t-dot"></div><div class="t-dot"></div></div>`;
  wrap.appendChild(row);
  return row;
}

function scrollBottom() {
  const w = document.getElementById('messages-wrap');
  setTimeout(() => w.scrollTop = w.scrollHeight, 40);
}

// ═══════════════ ATTACH / FILES ═══════════════
function toggleAttach() {
  const p = document.getElementById('attach-popup');
  p.classList.toggle('open');
}

document.addEventListener('click', e => {
  const popup = document.getElementById('attach-popup');
  if (!popup) return;
  if (!popup.contains(e.target) && !e.target.closest('.attach-btn')) {
    popup.classList.remove('open');
  }
});

function triggerFile(accept) {
  document.getElementById('file-input').accept = accept;
  document.getElementById('file-input').click();
  document.getElementById('attach-popup').classList.remove('open');
}

function handleFiles(e) {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      if (file.type.startsWith('image/')) {
        pendingFiles.push({ type: 'image', name: file.name, dataUrl: ev.target.result });
      } else {
        pendingFiles.push({ type: 'doc', name: file.name, dataUrl: ev.target.result });
      }
      renderFilePreviews();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function renderFilePreviews() {
  const row = document.getElementById('file-preview-row');
  row.innerHTML = '';
  if (pendingFiles.length === 0) { row.style.display = 'none'; return; }
  row.style.display = 'flex';
  pendingFiles.forEach((f, i) => {
    if (f.type === 'image') {
      const thumb = document.createElement('div');
      thumb.className = 'file-thumb';
      thumb.innerHTML = `<img src="${f.dataUrl}"><button class="rm-file" onclick="removeFile(${i})">×</button>`;
      row.appendChild(thumb);
    } else {
      const doc = document.createElement('div');
      doc.className = 'file-doc';
      doc.innerHTML = `📄 <span>${f.name}</span><button onclick="removeFile(${i})">×</button>`;
      row.appendChild(doc);
    }
  });
}

function removeFile(i) { pendingFiles.splice(i, 1); renderFilePreviews(); }

function searchGoogle() {
  document.getElementById('attach-popup').classList.remove('open');
  const q = document.getElementById('msg-box').value.trim() || prompt('Search Google for:');
  if (q) window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
}

function searchYouTube() {
  document.getElementById('attach-popup').classList.remove('open');
  const q = document.getElementById('msg-box').value.trim() || prompt('Search YouTube for:');
  if (q) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank');
}

function openLink() {
  document.getElementById('attach-popup').classList.remove('open');
  const url = prompt('Paste a URL to reference:');
  if (url) {
    document.getElementById('msg-box').value += (document.getElementById('msg-box').value ? ' ' : '') + url;
    document.getElementById('msg-box').focus();
  }
}

function openProfile() {
  alert(`Profile\n\nName: ${user.name || user.email}\nEmail: ${user.email}\nAI Name: ${quizData.aiName || 'Unnamed'}\nNickname: ${quizData.userNick || '—'}\n\nTo update your settings, sign out and sign back in.`);
}

// ═══════════════ BOOT ═══════════════
(function boot() {
  const saved = localStorage.getItem('aura_last_user');
  // Auto-restore skipped — always show landing for fresh feel
})();
