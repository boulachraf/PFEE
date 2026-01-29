// Game State
const gameState = {
    score: 0,
    level: 1,
    streak: 0,
    sessionId: generateSessionId(),
    questionStartTime: null,
    timerInterval: null,
    currentQuestion: null
};

// DOM Elements
const elements = {
    questionBox: document.getElementById('questionBox'),
    questionContent: document.getElementById('questionContent'),
    answerInput: document.getElementById('answerInput'),
    submitBtn: document.getElementById('submitBtn'),
    nextBtn: document.getElementById('nextBtn'),
    feedbackBox: document.getElementById('feedbackBox'),
    score: document.getElementById('score'),
    level: document.getElementById('level'),
    streak: document.getElementById('streak'),
    timer: document.getElementById('timer'),
    progressBar: document.getElementById('progressBar')
};

// Initialize Game
function initGame() {
    loadQuestion();
    setupEventListeners();
    startTimer();
}

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Load new question
async function loadQuestion() {
    try {
        showLoading();
        
        const response = await fetch(`/get_question?level=${gameState.level}&session_id=${gameState.sessionId}`);
        const data = await response.json();
        
        gameState.currentQuestion = data;
        gameState.questionStartTime = Date.now();
        
        displayQuestion(data.question);
        
    } catch (error) {
        console.error('Error loading question:', error);
        showError('Failed to load question. Please try again!');
    }
}

// Display question
function displayQuestion(question) {
    elements.questionContent.innerHTML = `<h2>${question}</h2>`;
    elements.answerInput.value = '';
    elements.answerInput.focus();
    elements.submitBtn.disabled = false;
    elements.nextBtn.style.display = 'none';
}

// Show loading state
function showLoading() {
    elements.questionContent.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Generating question...</p>
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    // Submit button
    elements.submitBtn.addEventListener('click', submitAnswer);
    
    // Enter key
    elements.answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitAnswer();
    });
    
    // Next button
    elements.nextBtn.addEventListener('click', () => {
        loadQuestion();
    });
}

// Submit answer
async function submitAnswer() {
    const userAnswer = parseInt(elements.answerInput.value);
    
    if (isNaN(userAnswer)) {
        showFeedback('⚠️ Please enter a valid number!', 'warning');
        return;
    }
    
    elements.submitBtn.disabled = true;
    
    try {
        const response = await fetch('/check_answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                answer: userAnswer,
                session_id: gameState.sessionId
            })
        });
        
        const result = await response.json();
        
        if (result.new_question) {
            showFeedback(result.feedback, 'error');
            setTimeout(loadQuestion, 1500);
            return;
        }
        
        // Update game state
        if (result.correct) {
            gameState.score += (10 + gameState.level * 2);
            gameState.streak++;
            
            // Bonus for streaks
            if (gameState.streak % 5 === 0) {
                gameState.score += 20;
                showFeedback('🔥 STREAK BONUS! +20 points!', 'bonus');
            }
            
            // Level up
            if (gameState.score >= gameState.level * 100) {
                gameState.level++;
                gameState.streak = 0;
                updateProgressBar();
                showFeedback(`🚀 LEVEL UP! Welcome to Level ${gameState.level}!`, 'levelup');
            }
        } else {
            gameState.streak = 0;
        }
        
        // Update UI
        updateStats();
        showFeedback(result.feedback, result.correct ? 'success' : 'error');
        
        // Show next button
        elements.nextBtn.style.display = 'block';
        
    } catch (error) {
        console.error('Error checking answer:', error);
        showError('Failed to check answer. Please try again!');
    }
}

// Update stats display
function updateStats() {
    elements.score.textContent = gameState.score;
    elements.level.textContent = gameState.level;
    elements.streak.textContent = gameState.streak;
}

// Update progress bar
function updateProgressBar() {
    const progress = (gameState.score % (gameState.level * 100)) / (gameState.level * 100) * 100;
    elements.progressBar.style.width = `${progress}%`;
    elements.progressBar.querySelector('.progress-text').textContent = `Level ${gameState.level}`;
    
    // Color based on progress
    if (progress < 33) {
        elements.progressBar.className = 'progress-bar progress-low';
    } else if (progress < 66) {
        elements.progressBar.className = 'progress-bar progress-medium';
    } else {
        elements.progressBar.className = 'progress-bar progress-high';
    }
}

// Show feedback
function showFeedback(message, type) {
    elements.feedbackBox.innerHTML = `<div class="feedback ${type}">${message}</div>`;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (!elements.feedbackBox.querySelector('.feedback:hover')) {
            elements.feedbackBox.innerHTML = '';
        }
    }, 3000);
}

// Show error
function showError(message) {
    elements.feedbackBox.innerHTML = `<div class="feedback error">${message}</div>`;
}

// Start timer
function startTimer() {
    let seconds = 0;
    gameState.timerInterval = setInterval(() => {
        seconds++;
        elements.timer.textContent = `${seconds}s`;
    }, 1000);
}

// Initialize game on load
window.addEventListener('DOMContentLoaded', initGame);