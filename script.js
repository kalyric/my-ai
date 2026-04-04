function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function scrollChatToBottom() {
  const chatBox = document.getElementById("chatBox");
  if (chatBox) {
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
  }
}

function bindChatEnter() {
  const input = document.getElementById("message");
  if (!input || input.dataset.enterBound) return;
  input.dataset.enterBound = "1";
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// Save user locally
function signup() {
  let name = document.getElementById("name").value;
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;
  let confirm = document.getElementById("confirmPassword").value;

  let msg = document.getElementById("authMsg");

  let regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W]).{12,}$/;

  if (!regex.test(password)) {
    msg.innerText = "Password must be 12 chars, uppercase, lowercase, special char.";
    return;
  }

  if (password !== confirm) {
    msg.innerText = "Passwords do not match.";
    return;
  }

  localStorage.setItem("user", JSON.stringify({ name, email, password }));
  msg.innerText = "Account created!";
}

// Login
function login() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  let user = JSON.parse(localStorage.getItem("user"));

  if (user && user.email === email && user.password === password) {
    showVerse();
  } else {
    document.getElementById("authMsg").innerText = "Invalid login.";
  }
}

// Fake Google login
function googleLogin() {
  localStorage.setItem("user", JSON.stringify({ name: "Google User" }));
  showVerse();
}

// Verse screen
function showVerse() {
  const auth = document.getElementById("auth");
  auth.innerHTML = "<h2>Psalm 155:1-2</h2><p>Trust in the Lord...</p>";
  auth.classList.add("verse-moment");

  setTimeout(() => {
    auth.style.transition = "opacity 0.4s ease";
    auth.style.opacity = "0";
    setTimeout(() => {
      auth.classList.add("hidden");
      auth.style.opacity = "";
      auth.style.transition = "";
      auth.classList.remove("verse-moment");
      document.getElementById("onboarding").classList.remove("hidden");
    }, 400);
  }, 3000);
}

// Finish onboarding
function finishOnboarding() {
  let data = {
    aiName: document.getElementById("aiName").value.trim() || "Assistant",
    userName: document.getElementById("userName").value,
    purpose: document.getElementById("purpose").value,
    dialect: document.getElementById("dialect").value,
    language: document.getElementById("language").value
  };

  localStorage.setItem("profile", JSON.stringify(data));

  document.getElementById("onboarding").classList.add("hidden");
  document.getElementById("chat").classList.remove("hidden");
  bindChatEnter();
  document.getElementById("message")?.focus();
}

// Chat system
function sendMessage() {
  let input = document.getElementById("message");
  let chatBox = document.getElementById("chatBox");

  let userMsg = input.value.trim();
  if (!userMsg) return;

  let profile = JSON.parse(localStorage.getItem("profile") || "null");
  if (!profile) {
    profile = { aiName: "Assistant", dialect: "", language: "English" };
  }

  let aiResponse = generateResponse(userMsg, profile);
  const aiName = profile.aiName || "Assistant";

  chatBox.insertAdjacentHTML(
    "beforeend",
    `<p class="msg"><strong>You:</strong> ${escapeHtml(userMsg)}</p>`
  );
  chatBox.insertAdjacentHTML(
    "beforeend",
    `<p class="msg"><strong>${escapeHtml(aiName)}:</strong> ${escapeHtml(aiResponse)}</p>`
  );

  input.value = "";
  scrollChatToBottom();
}

// Human-like responses
function generateResponse(msg, profile) {
  if (!profile) return "Hey… I hear you. Talk to me more about that.";
  let slang = profile.dialect || "";

  if (slang.toLowerCase().includes("arabic")) {
    return "Wallah I get you 😭 but listen, you got this fr.";
  }

  if (slang.toLowerCase().includes("aave")) {
    return "I feel you fr, like that’s real life. You gon be alright though.";
  }

  return "Hey… I hear you. Talk to me more about that.";
}

// Dashboard toggle
function toggleDashboard() {
  document.getElementById("dashboard").classList.toggle("hidden");
}

// Logout
function logout() {
  localStorage.clear();
  location.reload();
}

// Restore session: chat if profile exists, otherwise finish onboarding first
window.onload = () => {
  bindChatEnter();

  const user = localStorage.getItem("user");
  const profile = localStorage.getItem("profile");

  if (!user) return;

  document.getElementById("auth").classList.add("hidden");

  if (profile) {
    document.getElementById("chat").classList.remove("hidden");
    requestAnimationFrame(() => document.getElementById("message")?.focus());
  } else {
    document.getElementById("onboarding").classList.remove("hidden");
  }
};
