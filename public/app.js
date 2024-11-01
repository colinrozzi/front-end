class ChatApp {
    constructor() {
        console.log('Initializing ChatApp...');
        this.currentChatId = null;
        this.ws = new WebSocket('ws://localhost:4000/ws');
        this.initializeWebSocket();
        this.initializeEventListeners();
        this.loadChats();
    }

    initializeWebSocket() {
        console.log('Setting up WebSocket...');
        
        this.ws.onopen = () => {
            console.log('WebSocket connection established');
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        this.ws.onmessage = (event) => {
            console.log('WebSocket message received:', event.data);
            const data = JSON.parse(event.data);
            if (data.type === 'chat_message' && data.chatId === this.currentChatId) {
                console.log('Processing chat message for chat:', this.currentChatId);
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
            console.log('Fetching chats from server...');
            const response = await fetch('http://localhost:4000/chats');
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Raw response data:', data);
            // Handle both array and object responses
            const chats = Array.isArray(data) ? data : (data.chats || []);
            console.log('Processed chats:', chats);
            this.displayChats(chats);
        } catch (error) {
            console.error('Error loading chats:', error);
            console.error('Error details:', error.message);
        }
    }

    async createNewChat() {
        const chatName = prompt('Enter chat name:');
        if (!chatName) return;

        try {
            console.log('Creating new chat with name:', chatName);
            const response = await fetch(`http://localhost:4000/new-chat/${encodeURIComponent(chatName)}`, {
                method: 'POST'
            });
            console.log('Create chat response status:', response.status);
            const newChat = await response.json();
            console.log('New chat created:', newChat);
            await this.loadChats(); // Refresh chat list
            console.log('Chats reloaded after creation');
        } catch (error) {
            console.error('Error creating chat:', error);
            console.error('Error details:', error.message);
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message || !this.currentChatId) {
            console.log('Cannot send message: ', !message ? 'empty message' : 'no chat selected');
            return;
        }
        
        console.log('Sending message to chat:', this.currentChatId);

        try {
            const response = await fetch(`http://localhost:4000/chat/${this.currentChatId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            const updatedChat = await response.json();
            this.displayMessages(updatedChat.messages);
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    displayChats(chats) {
        console.log('Displaying chats:', chats);
        const chatList = document.getElementById('chatList');
        chatList.innerHTML = '';
        
        chats.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = 'chat-item';
            chatElement.textContent = chat.name;
            chatElement.dataset.chatId = chat.id;
            console.log('Creating chat element with ID:', chat.id);
            chatElement.onclick = () => this.selectChat(chat.id);
            if (chat.id === this.currentChatId) {
                chatElement.classList.add('active');
            }
            chatList.appendChild(chatElement);
        });
    }

    async selectChat(chatId) {
        console.log('Selecting chat:', chatId);
        console.log('Previous currentChatId:', this.currentChatId);
        this.currentChatId = chatId;
        console.log('Updated currentChatId:', this.currentChatId);
        try {
            console.log('Fetching chat details for:', chatId);
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
        console.log('Updating active chat style. Current chat ID:', this.currentChatId);
        document.querySelectorAll('.chat-item').forEach(item => {
            const itemId = item.dataset.chatId;
            console.log('Checking chat item:', itemId);
            item.classList.remove('active');
            if (itemId === this.currentChatId) {
                console.log('Setting active chat:', itemId);
                item.classList.add('active');
            }
        });
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
