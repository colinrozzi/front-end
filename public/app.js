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
        console.log('Setting up WebSocket connection...');
        
        this.ws.onopen = () => {
            console.log('WebSocket connection established');
        };

        this.ws.onmessage = (event) => {
            console.log('WebSocket message received:', event.data);
            try {
                const data = JSON.parse(event.data);
                console.log('Parsed WebSocket data:', data);
                
                if (data.type === 'update' && data.event?.data?.type === 'chat_message') {
                    console.log('Chat message update received for chat:', data.event.data.chatId);
                    if (data.event.data.chatId === this.currentChatId) {
                        const message = data.event.data.message.message;  // Extract nested message
                        console.log('Processing message:', message);
                        if (message.role === 'assistant') {
                            this.removeLoadingMessage();
                            this.appendMessage(message);
                            // Scroll to bottom after new message
                            const chatMessages = document.getElementById('chatMessages');
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed. Attempting to reconnect...');
            setTimeout(() => {
                console.log('Attempting WebSocket reconnection...');
                this.ws = new WebSocket('ws://localhost:4000/ws');
                this.setupWebSocket();
            }, 1000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    setupEventListeners() {
        document.getElementById('newChatBtn').addEventListener('click', () => this.createNewChat());
        document.getElementById('sendButton').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById('toggleSidebar').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('hidden');
        });
    }

    async loadChats() {
        try {
            const response = await fetch('http://localhost:4000/chats');
            const data = await response.json();
            const chats = Array.isArray(data) ? data : (data.chats || []);
            this.displayChats(chats);
            
            // Select first chat if no chat is currently selected
            if (!this.currentChatId && chats.length > 0) {
                await this.selectChat(chats[0].id);
            } else if (this.currentChatId && document.getElementById('chatMessages').children.length === 0) {
                await this.selectChat(this.currentChatId);
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
            // Update UI to show no chats available
            this.updateChatName('No chats available');
            this.displayMessages([]);
        }
    }

    async createNewChat() {
        const chatName = prompt('Enter chat name:');
        if (!chatName) return;
        
        try {
            const response = await fetch('http://localhost:4000/chats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: chatName })
            });
            
            if (!response.ok) throw new Error('Failed to create chat');
            
            const chat = await response.json();
            await this.loadChats();
            await this.selectChat(chat.id);
        } catch (error) {
            console.error('Error creating new chat:', error);
            alert('Failed to create new chat');
        }
    }

    updateChatName(name) {
        const chatNameElement = document.getElementById("currentChatName");
        chatNameElement.textContent = name || "Select a chat";
    }
}

document.addEventListener("DOMContentLoaded", () => new ChatApp());
