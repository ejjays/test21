const chatIcon = document.getElementById('chat-icon');
const chatPanel = document.getElementById('chat-panel');
const chatBackButton = document.getElementById('chat-back-button');
const chatInput = document.getElementById('chatInput');
const sendChatButton = document.getElementById('sendChatButton');
const chatMessages = document.getElementById('chatMessages');

chatIcon.addEventListener('click', () => {
    chatPanel.classList.add('open');
});

chatBackButton.addEventListener('click', () => {
    chatPanel.classList.remove('open');
});

sendChatButton.addEventListener('click', () => {
    const message = chatInput.value;
    if (message) {
        const messageElement = document.createElement("div");
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        chatInput.value = ''; // Clear input
    }
});