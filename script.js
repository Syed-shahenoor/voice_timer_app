// Timer Logic
let startTime = 0;
let elapsedTime = 0;
let timerInterval;
let timerState = 'stopped'; // 'stopped', 'running', 'paused'

const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const millisecondsEl = document.getElementById('milliseconds');
const timerDisplay = document.querySelector('.timer-display');
const transcriptBox = document.getElementById('transcript');

function formatTime(time) {
    const date = new Date(time);
    const ms = Math.floor(date.getUTCMilliseconds() / 10).toString().padStart(2, '0');
    const s = date.getUTCSeconds().toString().padStart(2, '0');
    const m = date.getUTCMinutes().toString().padStart(2, '0');
    const h = Math.floor(time / (1000 * 60 * 60)).toString().padStart(2, '0');
    
    return { h, m, s, ms: `.${ms}` };
}

function updateDisplay() {
    const { h, m, s, ms } = formatTime(elapsedTime);
    hoursEl.textContent = h;
    minutesEl.textContent = m;
    secondsEl.textContent = s;
    millisecondsEl.textContent = ms;
}

function updateTimerStateClass() {
    timerDisplay.className = `timer-display timer-state-${timerState}`;
}

function startTimer() {
    if (timerState === 'running') return;
    
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(() => {
        elapsedTime = Date.now() - startTime;
        updateDisplay();
    }, 10); 
    
    timerState = 'running';
    updateTimerStateClass();
    showTranscript("Started timer...");
}

function pauseTimer() {
    if (timerState !== 'running') return;
    
    clearInterval(timerInterval);
    timerState = 'paused';
    updateTimerStateClass();
    showTranscript("Paused timer.");
}

function stopTimer() {
    clearInterval(timerInterval);
    elapsedTime = 0;
    timerState = 'stopped';
    updateDisplay();
    updateTimerStateClass();
    showTranscript("Stopped and reset.");
}

// Speech Recognition Logic
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isListening = false;
let userAllowed = false;

const micBtn = document.getElementById('mic-btn');
const micStatus = document.getElementById('mic-status');

function showTranscript(text) {
    transcriptBox.textContent = `"${text}"`;
    transcriptBox.classList.add('transcript-active');
    setTimeout(() => transcriptBox.classList.remove('transcript-active'), 3000);
}

if (!SpeechRecognition) {
    micStatus.textContent = "Speech API Not Supported";
    micBtn.classList.add('mic-state-error');
    micBtn.disabled = true;
    showTranscript("Sorry, your browser doesn't support the Speech API. Please use Chrome or Edge.");
} else {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // Set to true to give immediate feedback on partial matching
    recognition.lang = 'en-US';
    
    let debounceTimer = null;

    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('mic-state-listening');
        micBtn.classList.remove('mic-state-error');
        micStatus.textContent = "Listening...";
        showTranscript("Say 'start', 'pause', or 'stop'");
    };

    recognition.onresult = (event) => {
        const lastResultIndex = event.results.length - 1;
        const result = event.results[lastResultIndex];
        const transcriptRaw = result[0].transcript.trim().toLowerCase();
        
        // Remove trailing periods that speech recognition sometimes adds
        const transcript = transcriptRaw.replace(/\./g, '');

        if (result.isFinal) {
            console.log("Final:", transcript);
            
            clearTimeout(debounceTimer);
            // Throttle command execution slightly to avoid rapid toggling
            debounceTimer = setTimeout(() => {
                if (transcript.includes('start')) {
                    startTimer();
                } else if (transcript.includes('stop')) {
                    stopTimer();
                } else if (transcript.includes('pause')) {
                    pauseTimer();
                } else {
                    showTranscript(transcript); // Show what was heard if no command matched
                }
            }, 100);
        } else {
            // Check for immediate commands even if not final for responsiveness
            if (transcript.includes('start') && timerState !== 'running') {
                startTimer();
            } else if (transcript.includes('stop') && timerState !== 'stopped') {
                stopTimer();
            } else if (transcript.includes('pause') && timerState === 'running') {
                pauseTimer();
            }
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        
        if (event.error === 'not-allowed') {
            userAllowed = false;
            micStatus.textContent = "Microphone Blocked";
            micBtn.classList.add('mic-state-error');
            micBtn.classList.remove('mic-state-listening');
            showTranscript("Microphone access denied. Click button to allow.");
        } else if (event.error !== 'no-speech') {
            // Do not permanently set false on network errors, just show error
            micStatus.textContent = "Error: " + event.error;
            micBtn.classList.add('mic-state-error');
        }
    };

    recognition.onend = () => {
        console.log("Speech recognition ended.");
        // Automatically restart if user allowed it (continuous listening mode)
        if (userAllowed) {
            try {
                recognition.start();
                console.log("Automatically restarting recognition...");
            } catch (e) {
                console.error("Failed to restart:", e);
                isListening = false;
                micBtn.classList.remove('mic-state-listening');
                micStatus.textContent = "Click to Resume Listening";
            }
        } else {
            isListening = false;
            micBtn.classList.remove('mic-state-listening');
            micStatus.textContent = "Click to Start Microphone";
        }
    };

    micBtn.addEventListener('click', () => {
        if (!userAllowed) {
            // First time or user previously blocked/stopped
            userAllowed = true;
            try {
                recognition.start();
            } catch(e) {
                console.error("Start failed:", e);
            }
        } else if (isListening) {
            // Manual toggle off
            userAllowed = false;
            recognition.stop();
        } else {
            // Ensure restart if state gets stuck
            userAllowed = true;
            try {
                recognition.start();
            } catch(e) {
                 console.error("Start failed:", e);
            }
        }
    });
}
