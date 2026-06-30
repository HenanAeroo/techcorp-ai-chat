/* ==========================================================================
   J.A.R.V.I.S. INTERFACE LOGIC - VANILLA JS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatHistory = document.getElementById('chat-history');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    const btnClear = document.getElementById('btn-clear');
    const btnReconnect = document.getElementById('btn-reconnect');
    const btnDictation = document.getElementById('btn-dictation');
    const micIcon = document.getElementById('mic-icon');
    const dictationStatus = document.getElementById('dictation-status');
    
    // Configurations & Toggles
    const tritonUrlInput = document.getElementById('triton-url');
    const modelNameInput = document.getElementById('model-name');
    const toggleTTS = document.getElementById('toggle-tts');
    const toggleSFX = document.getElementById('toggle-sfx');
    
    // Status Badges & Core UI
    const globalStatusBadge = document.getElementById('global-status-badge');
    const globalStatusText = document.getElementById('global-status-text');
    const arcReactor = document.getElementById('arc-reactor');
    const coreStateText = document.getElementById('core-state');
    
    // Diagnostics Telemetry
    const statLatency = document.getElementById('stat-latency');
    const statMessages = document.getElementById('stat-messages');
    const statWords = document.getElementById('stat-words');
    const statHost = document.getElementById('stat-host');

    // State Variables
    let isConnected = false;
    let messageCount = 0;
    let wordsSpoken = 0;
    let recognition = null;
    let isDictating = false;
    let speechUtterance = null;
    
    // Audio Context for real-time SFX synthesis
    let audioCtx = null;

    // Initialize Web Audio API on first user interaction if enabled
    function initAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /* ==========================================================================
       SOUND SYNTHESIZER (WEB AUDIO API)
       ========================================================================== */
    function playSFX(type) {
        if (!toggleSFX.checked) return;
        
        try {
            initAudioContext();
            if (!audioCtx) return;
            
            // Resume if suspended (browser security policy)
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            const now = audioCtx.currentTime;
            
            if (type === 'click') {
                // Short digital tick
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1500, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } 
            else if (type === 'send') {
                // Cyber transmit sweep
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } 
            else if (type === 'success') {
                // Cyber upward double-chime
                osc.type = 'sine';
                osc.frequency.setValueAtTime(900, now);
                osc.frequency.setValueAtTime(1200, now + 0.08);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } 
            else if (type === 'error') {
                // Dual buzzer tone
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.setValueAtTime(150, now + 0.1);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            }
            else if (type === 'voice-on') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1000, now);
                osc.frequency.exponentialRampToValueAtTime(1600, now + 0.1);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            }
            else if (type === 'voice-off') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            }
        } catch (e) {
            console.warn("Erreur d'initialisation audio:", e);
        }
    }

    /* ==========================================================================
       SPEECH RECOGNITION (SPEECH TO TEXT)
       ========================================================================== */
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'fr-FR';
        recognition.interimResults = false;
        
        recognition.onstart = () => {
            isDictating = true;
            btnDictation.classList.add('active');
            dictationStatus.classList.remove('hidden');
            playSFX('voice-on');
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            playSFX('click');
            // Auto submit speech input
            setTimeout(() => {
                sendMessage();
            }, 500);
        };
        
        recognition.onerror = (e) => {
            console.error("Speech recognition error", e);
            stopDictation();
            playSFX('error');
        };
        
        recognition.onend = () => {
            stopDictation();
        };
    } else {
        // Disable mic button if speech recognition is not supported in the browser
        btnDictation.disabled = true;
        btnDictation.title = "Reconnaissance vocale non supportée par votre navigateur.";
        btnDictation.style.opacity = '0.3';
    }

    function startDictation() {
        if (!recognition) return;
        try {
            // Cancel TTS if speaking
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            recognition.start();
        } catch (e) {
            console.error(e);
        }
    }

    function stopDictation() {
        if (!isDictating) return;
        isDictating = false;
        btnDictation.classList.remove('active');
        dictationStatus.classList.add('hidden');
        playSFX('voice-off');
        try {
            recognition.stop();
        } catch (e) {}
    }

    btnDictation.addEventListener('click', () => {
        initAudioContext();
        if (isDictating) {
            stopDictation();
        } else {
            startDictation();
        }
    });

    /* ==========================================================================
       TEXT TO SPEECH (VOICE RESPONSES)
       ========================================================================== */
    function speakText(text) {
        if (!toggleTTS.checked) return;
        
        // Stop current speech
        window.speechSynthesis.cancel();
        
        // Clean markdown structures from text for cleaner voice narration
        const cleanText = text
            .replace(/[\#\*\_`\[\]]/g, '') // remove markdown symbols
            .replace(/-\s+/g, '')          // remove list dashes
            .trim();
            
        speechUtterance = new SpeechSynthesisUtterance(cleanText);
        speechUtterance.lang = 'fr-FR';
        
        // Pick a French voice, preferably a natural sounding one
        const voices = window.speechSynthesis.getVoices();
        const frenchVoice = voices.find(voice => voice.lang.startsWith('fr'));
        if (frenchVoice) {
            speechUtterance.voice = frenchVoice;
        }
        
        // Sci-Fi robot touch
        speechUtterance.rate = 1.05;  // Slightly faster
        speechUtterance.pitch = 0.95; // Slightly lower pitch for JARVIS
        
        speechUtterance.onstart = () => {
            setCoreState('speaking');
        };
        
        speechUtterance.onend = () => {
            setCoreState(isConnected ? 'connected' : 'offline');
        };
        
        speechUtterance.onerror = () => {
            setCoreState(isConnected ? 'connected' : 'offline');
        };
        
        window.speechSynthesis.speak(speechUtterance);
        
        // Count words spoken
        const words = cleanText.split(/\s+/).length;
        wordsSpoken += words;
        statWords.textContent = wordsSpoken;
    }

    // Chrome requires calling getVoices first to populate list
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
    }

    /* ==========================================================================
       HUD STATE MANAGEMENT
       ========================================================================== */
    function setCoreState(state) {
        // Reset classes
        arcReactor.className = 'arc-reactor';
        
        if (state === 'thinking') {
            arcReactor.classList.add('thinking');
            coreStateText.textContent = "THINKING";
            coreStateText.style.color = "var(--neon-purple)";
        } else if (state === 'speaking') {
            arcReactor.classList.add('speaking');
            coreStateText.textContent = "SPEAKING";
            coreStateText.style.color = "var(--neon-cyan)";
        } else if (state === 'offline') {
            arcReactor.classList.add('offline');
            coreStateText.textContent = "OFFLINE";
            coreStateText.style.color = "var(--neon-red)";
        } else {
            // Connected / Idle
            coreStateText.textContent = "ONLINE";
            coreStateText.style.color = "var(--neon-cyan)";
        }
    }

    function setConnectionStatus(connected, message = '') {
        isConnected = connected;
        
        globalStatusBadge.className = 'status-badge';
        if (connected) {
            globalStatusBadge.classList.add('connected');
            globalStatusText.textContent = "CONNECTED";
            setCoreState('connected');
        } else {
            globalStatusBadge.classList.add('disconnected');
            globalStatusText.textContent = "OFFLINE";
            setCoreState('offline');
            if (message) {
                console.warn("Triton status message:", message);
            }
        }
    }

    /* ==========================================================================
       SERVER CONNECTION CHECK
       ========================================================================== */
    function checkConnection() {
        const tritonUrl = tritonUrlInput.value.trim();
        
        // Update telemetry hostname
        try {
            const urlObj = new URL(tritonUrl);
            statHost.textContent = urlObj.hostname + (urlObj.port ? ':' + urlObj.port : '');
        } catch (e) {
            statHost.textContent = tritonUrl;
        }

        fetch(`/api/status?url=${encodeURIComponent(tritonUrl)}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'connected') {
                    if (!isConnected) {
                        setConnectionStatus(true);
                        playSFX('success');
                    }
                } else {
                    if (isConnected) {
                        setConnectionStatus(false, data.message);
                        playSFX('error');
                    }
                }
            })
            .catch(err => {
                if (isConnected) {
                    setConnectionStatus(false, err.message);
                    playSFX('error');
                }
            });
    }

    // Run connection test and set periodic polling
    checkConnection();
    setInterval(checkConnection, 5000);

    btnReconnect.addEventListener('click', () => {
        playSFX('click');
        globalStatusBadge.className = 'status-badge connecting';
        globalStatusText.textContent = "TESTING...";
        checkConnection();
    });

    /* ==========================================================================
       CHAT CONVERSATION FLOW
       ========================================================================== */
    
    // Auto-scroll function
    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function formatTime() {
        const d = new Date();
        return d.toTimeString().split(' ')[0];
    }

    function appendMessage(sender, text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        let senderLabel = sender;
        if (type === 'user') senderLabel = '[USER]';
        else if (type === 'bot') senderLabel = '[JARVIS]';
        else if (type === 'system') senderLabel = '[SYSTEM]';

        // Render Markdown for bot messages using marked.js
        let renderedContent = text;
        if (type === 'bot') {
            renderedContent = marked.parse(text);
        } else if (type === 'system') {
            renderedContent = `<p>${text}</p>`;
        } else {
            // Escape HTML for user input
            const p = document.createElement('p');
            p.textContent = text;
            renderedContent = p.outerHTML;
        }

        messageDiv.innerHTML = `
            <div class="message-sender">${senderLabel}</div>
            <div class="message-content">${renderedContent}</div>
            <div class="message-time">${formatTime()}</div>
        `;
        
        chatHistory.appendChild(messageDiv);
        scrollToBottom();
        
        // Update stats
        if (type !== 'system') {
            messageCount++;
            statMessages.textContent = `${messageCount} msg`;
        }
    }

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Cancel vocal synthesis if speaking
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        // Add user message to UI
        appendMessage('User', text, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto'; // Reset text area height
        
        playSFX('send');
        setCoreState('thinking');

        // Create temporary system bubble as typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing-indicator-bubble';
        typingDiv.innerHTML = `
            <div class="message-sender">[JARVIS]</div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        chatHistory.appendChild(typingDiv);
        scrollToBottom();

        // Construct request payload
        const tritonUrl = tritonUrlInput.value.trim();
        const modelName = modelNameInput.value.trim();

        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: text,
                model: modelName,
                url: tritonUrl
            })
        })
        .then(res => {
            // Remove typing bubble
            const typingBubble = document.querySelector('.typing-indicator-bubble');
            if (typingBubble) typingBubble.remove();
            
            return res.json();
        })
        .then(data => {
            if (data.error) {
                appendMessage('System', `ERREUR: ${data.error}`, 'system');
                setCoreState('offline');
                playSFX('error');
            } else {
                appendMessage('Jarvis', data.response, 'bot');
                setCoreState('connected');
                
                // Update latency stat
                if (data.latency_ms) {
                    statLatency.textContent = `${data.latency_ms} ms`;
                }
                
                // Trigger Text-to-Speech response
                speakText(data.response);
                playSFX('success');
            }
        })
        .catch(err => {
            const typingBubble = document.querySelector('.typing-indicator-bubble');
            if (typingBubble) typingBubble.remove();
            
            appendMessage('System', `ERREUR TRANSMISSION: ${err.message}`, 'system');
            setCoreState('offline');
            playSFX('error');
        });
    }

    // Keyboard handlers
    chatInput.addEventListener('keydown', (e) => {
        initAudioContext();
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    btnSend.addEventListener('click', () => {
        initAudioContext();
        sendMessage();
    });

    // Auto-grow textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Suggestion chips clicks
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            initAudioContext();
            chatInput.value = chip.textContent;
            playSFX('click');
            sendMessage();
        });
    });

    // Clear history
    btnClear.addEventListener('click', () => {
        playSFX('click');
        chatHistory.innerHTML = '';
        messageCount = 0;
        statMessages.textContent = '0 msg';
        appendMessage('System', 'Liaison sécurisée réinitialisée. Historique effacé.', 'system');
        
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    });

    // Initial audio context unlock on hover/click settings
    document.body.addEventListener('click', () => {
        initAudioContext();
    }, { once: true });
});
