const chatArea = document.getElementById("chat-area");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Function to add message to chat
function addMessage(message, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.textContent = message;
    msgDiv.className = sender; // "user" or "bot"
    msgDiv.style.margin = "5px 0";
    if (sender === "user") msgDiv.style.textAlign = "right";
    else msgDiv.style.textAlign = "left";
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Event for send button
sendBtn.addEventListener("click", () => {
    const message = userInput.value;
    if (message.trim() !== "") {
        addMessage(message, "user");
        userInput.value = "";

        // Fake bot reply for now
        setTimeout(() => {
            addMessage("This is a test reply from your AI bot!", "bot");
        }, 500);
    }
});

// Allow pressing Enter to send
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendBtn.click();
});
