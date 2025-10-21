class FarmMateAI {
    constructor() {
        this.cropsData = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.speechSynthesis = window.speechSynthesis;
        this.isSpeaking = false;
        this.isMuted = false;
        this.currentUtterance = null;
        this.initializeApp();
    }

    async initializeApp() {
        await this.loadCropsData();
        this.setupEventListeners();
        this.checkBrowserSupport();
    }

    async loadCropsData() {
        try {
            const response = await fetch('crops_data.json');
            this.cropsData = await response.json();
        } catch (error) {
            console.error('Error loading crops data:', error);
            this.showErrorMessage('Failed to load farming data. Please refresh the page.');
        }
    }

    setupEventListeners() {
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');
        const muteButton = document.getElementById('muteButton');
        const recordButton = document.getElementById('recordButton');
        const suggestionChips = document.querySelectorAll('.suggestion-chip');

        // Send message on button click
        sendButton.addEventListener('click', () => this.handleUserInput());

        // Send message on Enter key
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUserInput();
            }
        });

        // Mute/unmute button
        muteButton.addEventListener('click', () => this.toggleMute());

        // Voice recording button
        recordButton.addEventListener('click', () => this.toggleRecording());

        // Setup suggestion chips
        suggestionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                userInput.value = chip.getAttribute('data-question');
                this.handleUserInput();
            });
        });

        // Auto-stop speech when new message comes
        this.setupSpeechControls();
    }

    setupSpeechControls() {
        // Stop speech when page is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopSpeech();
            }
        });
    }

    checkBrowserSupport() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            document.getElementById('recordButton').style.display = 'none';
            console.warn('Speech recognition not supported in this browser');
        }

        if (!('speechSynthesis' in window)) {
            document.getElementById('muteButton').style.display = 'none';
            console.warn('Speech synthesis not supported in this browser');
        }
    }

    handleUserInput() {
        const userInput = document.getElementById('userInput');
        const message = userInput.value.trim();

        if (message === '') return;

        // Display user message
        this.displayUserMessage(message);

        // Clear input
        userInput.value = '';

        // Show thinking indicator
        this.showThinkingIndicator();

        // Process and generate response
        setTimeout(() => {
            const response = this.generateResponse(message);
            this.hideThinkingIndicator();
            this.typeResponse(response);
            
            // Auto-speak the response if not muted
            if (!this.isMuted) {
                this.speakResponse(response);
            }
        }, 1000 + Math.random() * 1000);
    }

    displayUserMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'user-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <strong>You:</strong> ${this.escapeHtml(message)}
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        this.autoScroll();
    }

    displayBotMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'bot-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <strong>FarmMate AI:</strong> ${message}
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        this.autoScroll();
    }

    showThinkingIndicator() {
        document.getElementById('thinkingIndicator').style.display = 'flex';
        this.autoScroll();
    }

    hideThinkingIndicator() {
        document.getElementById('thinkingIndicator').style.display = 'none';
    }

    autoScroll() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.classList.add('auto-scroll');
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
            // Remove class after scroll to prevent smooth scroll on manual scroll
            setTimeout(() => chatMessages.classList.remove('auto-scroll'), 500);
        }, 100);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    generateResponse(userMessage) {
        if (!this.cropsData) {
            return "I'm still loading farming data. Please try again in a moment.";
        }

        const lowerMessage = userMessage.toLowerCase();
        let response = '';

        // Check for specific crop queries
        const crops = ['maize', 'rice', 'yam', 'cassava', 'cocoa'];
        const mentionedCrops = crops.filter(crop => lowerMessage.includes(crop));

        if (mentionedCrops.length > 0) {
            response = this.generateCropSpecificResponse(mentionedCrops, lowerMessage);
        } else if (lowerMessage.includes('disease') || lowerMessage.includes('sick') || lowerMessage.includes('problem')) {
            response = this.generateDiseaseOverviewResponse();
        } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            response = "Hello! I'm FarmMate AI, your farming assistant. I can help you with information about crops, diseases, prevention methods, and best farming practices for Ghanaian conditions. What specific crop would you like to know about?";
        } else if (lowerMessage.includes('thank')) {
            response = "You're welcome! I'm always here to help with your farming questions. Remember, good farming practices lead to better yields. Is there anything else you'd like to know?";
        } else if (lowerMessage.includes('weather') || lowerMessage.includes('rain')) {
            response = this.generateWeatherResponse();
        } else if (lowerMessage.includes('soil') || lowerMessage.includes('land')) {
            response = this.generateSoilResponse();
        } else if (lowerMessage.includes('market') || lowerMessage.includes('sell') || lowerMessage.includes('price')) {
            response = this.generateMarketResponse();
        } else if (lowerMessage.includes('fertilizer') || lowerMessage.includes('manure')) {
            response = this.generateGeneralFertilizerResponse();
        } else if (lowerMessage.includes('planting') || lowerMessage.includes('season')) {
            response = this.generatePlantingSeasonResponse();
        } else {
            response = this.generateFallbackResponse(lowerMessage);
        }

        return response;
    }

    generateFallbackResponse(userMessage) {
        const fallbackResponses = [
            "I understand you're asking about farming. While I specialize in maize, rice, yam, cassava, and cocoa, I'd be happy to help with general farming advice for Ghana. Could you specify which crop you're interested in?",
            
            "That's an interesting question! I'm designed to help Ghanaian farmers with specific crop advice. You can ask me about diseases, prevention methods, best varieties, or growing conditions for maize, rice, yam, cassava, and cocoa.",
            
            "I want to make sure I give you the most accurate information. Could you tell me which crop you're referring to? I have detailed knowledge about maize, rice, yam, cassava, and cocoa farming in Ghana.",
            
            "Thank you for your question! To provide the best assistance, I focus on these key crops: maize, rice, yam, cassava, and cocoa. Which one would you like to learn more about today?",
            
            "I'm here to support Ghanaian farmers with practical advice. Let me know if you have questions about crop diseases, prevention techniques, fertilizer recommendations, or best farming practices for any of these crops: maize, rice, yam, cassava, or cocoa."
        ];

        // Simple keyword matching for better context
        if (userMessage.includes('how') && userMessage.includes('grow')) {
            return "I can help you with growing techniques! Please specify which crop: maize, rice, yam, cassava, or cocoa? Each has different requirements for successful cultivation in Ghana.";
        }
        
        if (userMessage.includes('when') && userMessage.includes('plant')) {
            return "Planting seasons vary by crop and region in Ghana. For accurate timing, please let me know which crop you're asking about: maize, rice, yam, cassava, or cocoa?";
        }

        if (userMessage.includes('water') || userMessage.includes('irrigation')) {
            return "Water management is crucial for farming success. Different crops have different water needs. Could you specify which crop you're asking about?";
        }

        // Random fallback response
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    generateCropSpecificResponse(crops, userMessage) {
        const crop = crops[0];
        const cropData = this.cropsData.crops[crop];
        
        if (!cropData) {
            return `I don't have specific information about ${crop} in my database. I specialize in maize, rice, yam, cassava, and cocoa farming advice for Ghana.`;
        }

        if (userMessage.includes('disease') || userMessage.includes('sick') || userMessage.includes('problem')) {
            return this.generateDiseaseResponse(crop, cropData);
        } else if (userMessage.includes('variety') || userMessage.includes('type') || userMessage.includes('kind')) {
            return this.generateVarietyResponse(crop, cropData);
        } else if (userMessage.includes('fertilizer') || userMessage.includes('nutrient') || userMessage.includes('feed')) {
            return this.generateFertilizerResponse(crop, cropData);
        } else if (userMessage.includes('grow') || userMessage.includes('plant') || userMessage.includes('cultivate')) {
            return this.generateGrowingResponse(crop, cropData);
        } else if (userMessage.includes('harvest') || userMessage.includes('pick') || userMessage.includes('collect')) {
            return this.generateHarvestResponse(crop, cropData);
        } else {
            return this.generateCropOverviewResponse(crop, cropData);
        }
    }

    generateCropOverviewResponse(crop, cropData) {
        let response = `<p>Here's what I know about ${crop} farming in Ghana:</p>`;
        response += `<p>${cropData.description}</p>`;
        response += `<p><strong>Growing Conditions:</strong></p>`;
        response += `<p>Soil: ${cropData.growing_conditions.soil}</p>`;
        response += `<p>Rainfall: ${cropData.growing_conditions.rainfall}</p>`;
        response += `<p>Temperature: ${cropData.growing_conditions.temperature}</p>`;
        response += `<p>Main Regions: ${cropData.growing_conditions.regions}</p>`;
        response += `<p><strong>Common Varieties:</strong> ${cropData.common_varieties.join(', ')}</p>`;
        response += `<p>You can ask me about specific diseases, prevention methods, fertilizer recommendations, or harvesting tips for ${crop}.</p>`;

        return response;
    }

    generateDiseaseResponse(crop, cropData) {
        let response = `<p>Here are the common diseases that affect ${crop} in Ghana:</p>`;
        
        cropData.diseases.forEach(disease => {
            response += `<p><strong>${disease.name}</strong></p>`;
            response += `<p>Symptoms: ${disease.symptoms}</p>`;
            response += `<p>Prevention: ${disease.prevention.join(', ')}</p>`;
            if (disease.treatment) {
                response += `<p>Treatment: ${disease.treatment}</p>`;
            }
        });

        response += `<p>For ${crop}, I also recommend: ${cropData.pests.map(pest => pest.name).join(', ')} control.</p>`;
        return response;
    }

    generateVarietyResponse(crop, cropData) {
        let response = `<p>Here are the recommended varieties for ${crop} in Ghana:</p>`;
        cropData.common_varieties.forEach(variety => {
            response += `<p>${variety}</p>`;
        });
        response += `<p>The most popular variety is usually "${cropData.common_varieties[0]}". Choose varieties based on your specific growing conditions and market preferences.</p>`;
        return response;
    }

    generateFertilizerResponse(crop, cropData) {
        let response = `<p>Fertilizer recommendations for ${crop} in Ghana:</p>`;
        response += `<p><strong>Recommended Application:</strong></p>`;
        response += `<p>${cropData.fertilizer_recommendation}</p>`;
        response += `<p><strong>Additional Tips:</strong></p>`;
        response += `<p>Always conduct soil testing for precise recommendations</p>`;
        response += `<p>Split applications often work better than single applications</p>`;
        response += `<p>Combine with organic manure for better soil health</p>`;
        response += `<p>Consider using Ghana's Planting for Food and Jobs program inputs</p>`;
        return response;
    }

    generateGrowingResponse(crop, cropData) {
        let response = `<p>Growing ${crop} successfully in Ghana:</p>`;
        response += `<p><strong>Ideal Conditions:</strong></p>`;
        response += `<p>${cropData.growing_conditions.soil}</p>`;
        response += `<p>${cropData.growing_conditions.rainfall}</p>`;
        response += `<p>${cropData.growing_conditions.temperature}</p>`;
        response += `<p><strong>Best Regions:</strong> ${cropData.growing_conditions.regions}</p>`;
        response += `<p><strong>Key Practices:</strong></p>`;
        response += `<p>Use certified seeds/planting materials</p>`;
        response += `<p>Follow proper spacing recommendations</p>`;
        response += `<p>Implement crop rotation where possible</p>`;
        response += `<p>Monitor regularly for pests and diseases</p>`;
        return response;
    }

    generateHarvestResponse(crop, cropData) {
        let response = `<p>Harvesting ${crop} in Ghana:</p>`;
        response += `<p><strong>Timing:</strong> ${cropData.harvesting}</p>`;
        response += `<p><strong>Harvest Indicators:</strong></p>`;
        if (crop === 'maize') {
            response += `<p>Kernels hard and glossy</p><p>Moisture content 20-25%</p><p>Black layer formation at kernel base</p>`;
        } else if (crop === 'rice') {
            response += `<p>80-85% of panicles turn yellow</p><p>Grains firm when pressed</p><p>Moisture content around 20%</p>`;
        } else if (crop === 'yam') {
            response += `<p>Vines begin to dry and yellow</p><p>Tubers reach mature size</p><p>8-10 months after planting</p>`;
        } else if (crop === 'cassava') {
            response += `<p>Leaves yellowing and dropping</p><p>Roots reach desired size</p><p>8-18 months depending on variety</p>`;
        } else if (crop === 'cocoa') {
            response += `<p>Pod color changes (yellow/orange for ripe)</p><p>Main crop: Oct-Jan, Light crop: Jun-Aug</p><p>Harvest every 2-4 weeks</p>`;
        }
        return response;
    }

    generateDiseaseOverviewResponse() {
        let response = "<p>I can help you with crop diseases! Here are the main crops I have disease information for:</p>";
        
        Object.keys(this.cropsData.crops).forEach(crop => {
            const cropData = this.cropsData.crops[crop];
            response += `<p><strong>${crop.charAt(0).toUpperCase() + crop.slice(1)}:</strong> `;
            response += `${cropData.diseases.map(d => d.name).join(', ')}</p>`;
        });

        response += "<p>You can ask about specific diseases like 'How to prevent maize lethal necrosis' or 'What causes rice blast' for detailed information.</p>";
        return response;
    }

    generateWeatherResponse() {
        return "<p>For weather-specific advice in Ghana:</p><p>Major rainy season: April-July</p><p>Minor rainy season: September-October</p><p>Dry season: November-March</p><p>Plan your planting accordingly and consider using drought-tolerant varieties during dry spells. Always check with your local Meteorological Agency for current weather forecasts.</p>";
    }

    generateSoilResponse() {
        return "<p>Soil management tips for Ghanaian farmers:</p>" + this.cropsData.general_farming.soil_management.map(item => `<p>${item}</p>`).join('');
    }

    generateMarketResponse() {
        return "<p>For market information in Ghana:</p><p>Check with local Agric Extension Officers</p><p>Visit regional markets for current prices</p><p>Consider farmer cooperatives for better bargaining</p><p>Explore the Planting for Food and Jobs market</p><p>Look into export opportunities for certified products</p><p>Monitor prices through the Ministry of Food and Agriculture website</p>";
    }

    generateGeneralFertilizerResponse() {
        return "<p>General fertilizer advice for Ghanaian farmers:</p><p>Always conduct soil testing before applying fertilizers</p><p>Use NPK 15-15-15 as a general-purpose fertilizer</p><p>Consider organic manure to improve soil structure</p><p>Follow recommended application rates for each crop</p><p>Split applications often work better than single doses</p><p>Consult with local extension officers for specific recommendations</p>";
    }

    generatePlantingSeasonResponse() {
        return "<p>Planting seasons in Ghana vary by crop and region:</p><p>Major season: April-July (most crops)</p><p>Minor season: September-October (some crops)</p><p>The optimal timing depends on:</p><p>Crop type</p><p>Variety</p><p>Rainfall patterns</p><p>Soil conditions</p><p>For specific crop timing, ask me about maize, rice, yam, cassava, or cocoa planting seasons.</p>";
    }

    typeResponse(response) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'bot-message';
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = `<strong>FarmMate AI:</strong> `;
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);

        let index = 0;
        const typingSpeed = 10;

        const typeCharacter = () => {
            if (index < response.length) {
                messageContent.innerHTML = `<strong>FarmMate AI:</strong> ${response.substring(0, index + 1)}`;
                index++;
                setTimeout(typeCharacter, typingSpeed);
                this.autoScroll();
            } else {
                this.autoScroll();
            }
        };

        typeCharacter();
    }

    // Text-to-Speech functionality
    toggleMute() {
        this.isMuted = !this.isMuted;
        const muteIcon = document.getElementById('muteIcon');
        const unmuteIcon = document.getElementById('unmuteIcon');
        
        if (this.isMuted) {
            this.stopSpeech();
            muteIcon.style.display = 'none';
            unmuteIcon.style.display = 'block';
            document.getElementById('muteButton').classList.remove('active');
        } else {
            muteIcon.style.display = 'block';
            unmuteIcon.style.display = 'none';
            // Auto-speak the last message when unmuted
            this.speakLastMessage();
        }
    }

    speakResponse(response) {
        if (this.isMuted) return;
        
        // Clean response for speech (remove HTML tags)
        const cleanResponse = response.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        this.stopSpeech(); // Stop any current speech

        this.currentUtterance = new SpeechSynthesisUtterance(cleanResponse);
        this.currentUtterance.rate = 0.9;
        this.currentUtterance.pitch = 1;
        this.currentUtterance.volume = 0.8;

        this.currentUtterance.onstart = () => {
            this.isSpeaking = true;
            if (!this.isMuted) {
                document.getElementById('muteButton').classList.add('active');
            }
        };

        this.currentUtterance.onend = () => {
            this.isSpeaking = false;
            this.currentUtterance = null;
            if (!this.isMuted) {
                document.getElementById('muteButton').classList.remove('active');
            }
        };

        this.currentUtterance.onerror = () => {
            this.isSpeaking = false;
            this.currentUtterance = null;
            document.getElementById('muteButton').classList.remove('active');
        };

        this.speechSynthesis.speak(this.currentUtterance);
    }

    speakLastMessage() {
        const botMessages = document.querySelectorAll('.bot-message');
        if (botMessages.length === 0) return;

        const lastMessage = botMessages[botMessages.length - 1];
        const messageText = lastMessage.textContent.replace('FarmMate AI:', '').trim();
        
        this.speakResponse(messageText);
    }

    stopSpeech() {
        if (this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
            this.isSpeaking = false;
            this.currentUtterance = null;
            document.getElementById('muteButton').classList.remove('active');
        }
    }

    // Voice Recording functionality
    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                this.processRecording();
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            document.getElementById('recordButton').classList.add('recording');
            document.getElementById('recordingIndicator').style.display = 'flex';
            this.autoScroll();
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showErrorMessage('Microphone access denied. Please allow microphone permissions to use voice recording.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            document.getElementById('recordButton').classList.remove('recording');
            document.getElementById('recordingIndicator').style.display = 'none';
        }
    }

    processRecording() {
        // Simulate speech recognition and auto-send
        const simulatedQuestions = [
            "Tell me about maize diseases",
            "How to prevent rice blast",
            "Best varieties for cassava",
            "Cocoa fertilizer recommendations",
            "What are common yam diseases"
        ];
        
        const randomQuestion = simulatedQuestions[Math.floor(Math.random() * simulatedQuestions.length)];
        
        // Auto-fill and send the question
        document.getElementById('userInput').value = randomQuestion;
        this.handleUserInput();
    }

    showErrorMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'bot-message';
        messageDiv.innerHTML = `
            <div class="message-content" style="background: #ffe6e6; border: 1px solid #ffcccc;">
                <strong>FarmMate AI:</strong> ${message}
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        this.autoScroll();
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FarmMateAI();
});