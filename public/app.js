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
            // Get the hash of the last message to use as parent
            const chatMessages = document.getElementById('chatMessages');
            const lastMessage = chatMessages.lastElementChild;
            const parentHash = lastMessage ? lastMessage.dataset.hash : null;
            
            // Display user message immediately
            this.appendMessage({
                content: JSON.stringify({
                    role: 'user',
                    content: message
                }),
                hash: 'temp-' + Date.now(), // Temporary hash until server responds
                parentHash: parentHash
            });
            
            // Show loading state
            this.appendLoadingMessage();
            
            // Send to chat-state service
            await fetch(`http://localhost:4000/chat/${this.currentChatId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: {
                        role: 'user',
                        content: message
                    },
                    parentHash: parentHash
                })
            });
            
            messageInput.value = '';
            this.removeLoadingMessage();
        } catch (error) {
            console.error('Failed to send message:', error);
            this.removeLoadingMessage();
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
        if (!chatId) {
            console.log('No chat selected');
            return;
        }
        
        this.currentChatId = chatId;
        try {
            const response = await fetch(`http://localhost:4000/chat/${chatId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const chat = await response.json();
            if (chat && Array.isArray(chat.messages)) {
                this.displayMessages(chat.messages);
            } else {
                this.displayMessages([]);
            }
            this.updateActiveChatStyle();
            this.updateChatName(chat?.name || 'Unnamed Chat');
        } catch (error) {
            console.error('Failed to load chat:', error);
            this.displayMessages([]);
            this.updateChatName('Error loading chat');
        }
    }

    displayMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            const emptyStateElement = document.createElement('div');
            emptyStateElement.className = 'empty-state-message';
            emptyStateElement.textContent = 'No messages yet. Start a conversation!';
            chatMessages.appendChild(emptyStateElement);
            return;
        }
        
        // Create a map of messages by hash for easy lookup
        const messageMap = new Map();
        messages.forEach(msg => {
            if (msg && msg.hash) {
                messageMap.set(msg.hash, msg);
            }
        });
        
        // Find root messages (those without parents or with unknown parents)
        const rootMessages = messages.filter(msg => 
            msg && (!msg.parentHash || !messageMap.has(msg.parentHash))
        );
        
        // Recursively display messages starting from roots
        rootMessages.forEach(msg => {
            if (msg) {
                this.displayMessageThread(msg, messages, messageMap, 0);
            }
        });
    }

    displayMessageThread(message, allMessages, messageMap, depth) {
        this.appendMessage(message, depth);
        
        // Find and display child messages
        const children = allMessages.filter(msg => msg.parentHash === message.hash);
        children.forEach(child => {
            this.displayMessageThread(child, allMessages, messageMap, depth + 1);
        });
    }

    appendMessage(message, depth = 0) {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        
        // Extract content from message structure
        const content = message.content;
        const hash = message.hash;
        
        // Determine message type/role from content if needed
        const role = content.includes('"role":"assistant"') ? 'assistant' : 'user';
        
        // Create message container with indentation
        messageElement.className = `message ${role}-message`;
        messageElement.style.marginLeft = `${depth * 20}px`; // Indent based on depth
        messageElement.dataset.hash = hash;
        
        // Parse and display the actual message content
        try {
            const parsedContent = JSON.parse(content);
            messageElement.textContent = parsedContent.content || parsedContent.message;
        } catch (e) {
            messageElement.textContent = content;
        }
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    appendLoadingMessage() {
        const chatMessages = document.getElementById('chatMessages');
        const loadingElement = document.createElement('div');
        loadingElement.className = 'message loading-message';
        loadingElement.textContent = 'AI is thinking...';
        loadingElement.id = 'loadingMessage';
        chatMessages.appendChild(loadingElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    removeLoadingMessage() {
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }

    updateActiveChatStyle() {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chatId === this.currentChatId);
        });
    }

    updateChatName(name) {
        const chatNameElement = document.getElementById('currentChatName');
        chatNameElement.textContent = name || 'Select a chat';
    }
}

document.addEventListener('DOMContentLoaded', () => new ChatApp());
