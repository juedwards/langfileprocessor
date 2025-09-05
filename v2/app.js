// Existing language file processor code
// ... (keep your existing code here)

// Azure OpenAI Chat functionality
const AZURE_FUNCTION_URL = '/api/chat'; // This will be your Azure Function endpoint

// Chat state
let chatHistory = [];
let isProcessing = false;

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', function() {
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    }
});

async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    
    const message = userInput.value.trim();
    if (!message || isProcessing) return;
    
    // Disable input while processing
    isProcessing = true;
    userInput.disabled = true;
    sendButton.disabled = true;
    
    // Add user message to chat
    addMessageToChat('user', message);
    userInput.value = '';
    
    // Show loading indicator
    const loadingId = 'loading-' + Date.now();
    addMessageToChat('assistant', '...', loadingId);
    
    try {
        // Call Azure Function endpoint
        const response = await fetch(AZURE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: chatHistory
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to get response from AI');
        }
        
        const data = await response.json();
        
        // Remove loading indicator
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // Add AI response to chat
        addMessageToChat('assistant', data.response);
        
        // Update chat history
        chatHistory.push(
            { role: 'user', content: message },
            { role: 'assistant', content: data.response }
        );
        
        // Keep only last 10 messages in history to manage token usage
        if (chatHistory.length > 10) {
            chatHistory = chatHistory.slice(-10);
        }
        
    } catch (error) {
        console.error('Error:', error);
        
        // Remove loading indicator
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.remove();
        }
        
        addMessageToChat('assistant', 'Sorry, I encountered an error. Please try again later.');
    } finally {
        // Re-enable input
        isProcessing = false;
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

function addMessageToChat(role, content, id = null) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    if (id) {
        messageDiv.id = id;
    }
    
    const roleLabel = document.createElement('div');
    roleLabel.className = 'message-role';
    roleLabel.textContent = role === 'user' ? 'You' : 'AI Assistant';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;
    
    messageDiv.appendChild(roleLabel);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
