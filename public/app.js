/**
 * ChatApp - Frontend for chat-state service
 * Handles real-time chat functionality using WebSocket and REST APIs
 */
class ChatApp {
    constructor() {
        this.currentChatId = null;
        this.ws = new WebSocket('ws://localhost:4000/ws');
        this.setupWebSocket();
        this.setupEventListeners();
        this.loadChats();
    }

    setupWebSocket() {
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'update' && data.event?.data?.type === 'chat_message') {
                if (data.event.data.chatId === this.currentChatId) {
                    this.appendMessage(data.event.data.message.message);
                }
                this.loadChats();
            }
        };
    }

    setupEventListeners() {
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
            const chats = Array.isArray(data) ? data : (data.chats || []);
            this.displayChats(chats);
            
            if (this.currentChatId && document.getElementById('chatMessages').children.length === 0) {
                await this.selectChat(this.currentChatId);
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
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
            await this.loadChats();
            await this.selectChat(newChat.id);
        } catch (error) {
            console.error('Failed to create chat:', error);
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message || !this.currentChatId) return;

        try {
            await fetch(`http://localhost:4000/chat/${this.currentChatId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            messageInput.value = '';
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }

    displayChats(chats) {
        const chatList = document.getElementById('chatList');
        chatList.innerHTML = '';
        
        chats.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = 'chat-item';
            chatElement.textContent = chat.name;
            chatElement.dataset.chatId = chat.id;
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
            console.error('Failed to load chat:', error);
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
        messageElement.textContent = typeof message === 'object' ? message.content || JSON.stringify(message) : message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    updateActiveChatStyle() {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chatId === this.currentChatId);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new ChatApp());
