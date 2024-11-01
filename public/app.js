class ChatApp {
    constructor() {
        this.currentChatId = null;
        this.ws = new WebSocket('ws://localhost:4000');
        this.initializeWebSocket();
        this.initializeEventListeners();
        this.loadChats();
    }

    initializeWebSocket() {
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'chat_message' && data.chatId === this.currentChatId) {
                this.appendMessage(data.message);
            }
        };
    }

    initializeEventListeners() {
        document.getElementById('newChatBtn').addEventListener('click', () => this.createNewChat());
        document.getElementById('sendButton').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    async loadChats() {
        try {
            const response = await fetch('http://localhost:4000/chats');
            const data = await response.json();
            this.displayChats(data.chats);
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    }

    async createNewChat() {
        const chatName = prompt('Enter chat name:');
        if (!chatName) return;

        try {
            const response = await fetch(`http://localhost:4000/new-chat/${encodeURIComponent(chatName)}`, {
                method: 'POST'
            });
            const newChat = await response.json();
            this.loadChats(); // Refresh chat list
        } catch (error) {
            console.error('Error creating chat:', error);
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message || !this.currentChatId) return;

        try {
            await fetch(`http://localhost:4000/chat/${this.currentChatId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    displayChats(chats) {
        const chatList = document.getElementById('chatList');
        chatList.innerHTML = '';
        
        chats.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = 'chat-item';
            chatElement.textContent = chat.name;
            chatElement.onclick = () => this.selectChat(chat.id);
            if (chat.id === this.currentChatId) {
                chatElement.classList.add('active');
            }
            chatList.appendChild(chatElement);
        });
    }

    async selectChat(chatId) {
        this.currentChatId = chatId;
        try {
            const response = await fetch(`http://localhost:4000/chat/${chatId}`);
            const chat = await response.json();
            this.displayMessages(chat.messages);
            this.updateActiveChatStyle();
        } catch (error) {
            console.error('Error loading chat:', error);
        }
    }

    displayMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        messages.forEach(message => this.appendMessage(message));
    }

    appendMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    updateActiveChatStyle() {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.chatId === this.currentChatId) {
                item.classList.add('active');
            }
        });
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
