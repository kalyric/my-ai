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
  document.getElementById("auth").innerHTML =
    "<h2>Psalm 155:1-2</h2><p>Trust in the Lord...</p>";

  setTimeout(() => {
    document.getElementById("auth").classList.add("hidden");
    document.getElementById("onboarding").classList.remove("hidden");
  }, 3000);
}

// Finish onboarding
function finishOnboarding() {
  let data = {
    aiName: document.getElementById("aiName").value,
    userName: document.getElementById("userName").value,
    dialect: document.getElementById("dialect").value,
    language: document.getElementById("language").value
  };

  localStorage.setItem("profile", JSON.stringify(data));

  document.getElementById("onboarding").classList.add("hidden");
  document.getElementById("chat").classList.remove("hidden");
}

// Chat system
function sendMessage() {
  let input = document.getElementById("message");
  let chatBox = document.getElementById("chatBox");

  let userMsg = input.value;

  let profile = JSON.parse(localStorage.getItem("profile"));

  let aiResponse = generateResponse(userMsg, profile);

  chatBox.innerHTML += `<p><strong>You:</strong> ${userMsg}</p>`;
  chatBox.innerHTML += `<p><strong>${profile.aiName}:</strong> ${aiResponse}</p>`;

  input.value = "";
}

// Human-like responses
function generateResponse(msg, profile) {
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

// Auto login
window.onload = () => {
  if (localStorage.getItem("user")) {
    document.getElementById("auth").classList.add("hidden");
    document.getElementById("chat").classList.remove("hidden");
  }
};
