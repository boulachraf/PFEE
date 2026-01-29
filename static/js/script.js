class CodeQuestGame {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.score = 0;
        this.level = 1;
        this.streak = 0;
        this.answeredCount = 0;
        this.currentQuestion = null;
        this.category = 'all';
        this.difficulty = 'all';
        
        this.initEventListeners();
        this.loadCategories();
        this.loadQuestion();
    }
    
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            const categories = await response.json();
            
            const container = document.getElementById('categoryFilters');
            container.innerHTML = '<button class="filter-btn active" data-category="all">All</button>';
            
            categories.forEach(category => {
                const btn = document.createElement('button');
                btn.className = 'filter-btn';
                btn.dataset.category = category;
                btn.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                btn.addEventListener('click', () => this.setCategory(category));
                container.appendChild(btn);
            });
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }
    
    setCategory(category) {
        this.category = category;
        document.querySelectorAll('[data-category]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        this.loadQuestion();
    }
    
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        document.querySelectorAll('[data-difficulty]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
        });
        this.loadQuestion();
    }
    
    async loadQuestion() {
        this.showLoading();
        
        try {
            const response = await fetch(
                `/api/get_question?session_id=${this.sessionId}&category=${this.category}&difficulty=${this.difficulty}`
            );
            const data = await response.json();
            
            if (data.completed) {
                this.showCompletion(data.message);
                return;
            }
            
            this.currentQuestion = data;
            this.renderQuestion(data);
            hljs.highlightAll();
        } catch (error) {
            console.error('Error loading question:', error);
            this.showError('Failed to load question. Please try again!');
        }
    }
    
    renderQuestion(question) {
        // Hide loader
        document.getElementById('questionLoader').style.display = 'none';
        
        // Set category badge
        const categoryBadge = document.getElementById('categoryBadge');
        categoryBadge.textContent = question.category;
        categoryBadge.className = `category-badge category-${question.category}`;
        
        // Set difficulty badge
        const difficultyBadge = document.getElementById('difficultyBadge');
        difficultyBadge.textContent = question.difficulty;
        difficultyBadge.className = `difficulty-badge difficulty-${question.difficulty}`;
        
        // Render question text with code blocks
        document.getElementById('questionText').innerHTML = this.formatQuestionText(question.question);
        
        // Render options
        const optionsContainer = document.getElementById('optionsContainer');
        optionsContainer.innerHTML = '';
        
        question.options.forEach((option, index) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'option';
            optionEl.dataset.index = index;
            optionEl.innerHTML = this.formatCodeInText(option);
            optionEl.addEventListener('click', () => this.selectOption(index));
            optionsContainer.appendChild(optionEl);
        });
        
        // Reset feedback area
        document.getElementById('feedbackArea').innerHTML = '';
        
        // Hide next button
        document.getElementById('nextBtn').style.display = 'none';
    }
    
    formatQuestionText(text) {
        // Convert markdown-style code blocks to HTML with syntax highlighting
        return text.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
            const language = lang || 'plaintext';
            return `<pre><code class="language-${language}">${this.escapeHtml(code.trim())}</code></pre>`;
        });
    }
    
    formatCodeInText(text) {
        // Format inline code snippets
        return text.replace(/`([^`]+)`/g, (match, code) => {
            return `<code class="inline-code">${this.escapeHtml(code)}</code>`;
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showLoading() {
        document.getElementById('questionLoader').style.display = 'flex';
        document.getElementById('questionText').innerHTML = '';
        document.getElementById('optionsContainer').innerHTML = '';
        document.getElementById('feedbackArea').innerHTML = '';
    }
    
    selectOption(index) {
        // Disable all options after selection
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.add('disabled');
            if (opt.dataset.index == index) {
                opt.classList.add('selected');
            }
        });
        
        this.checkAnswer(index);
    }
    
    async checkAnswer(selectedIndex) {
        try {
            const response = await fetch('/api/check_answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    answer_index: selectedIndex
                })
            });
            
            const result = await response.json();
            
            // Update stats
            this.score = result.score;
            this.level = result.level;
            this.streak = result.streak;
            this.answeredCount++;
            
            this.updateStats();
            
            // Show feedback
            this.showFeedback(result, selectedIndex);
            
        } catch (error) {
            console.error('Error checking answer:', error);
            this.showError('Failed to check answer. Please try again!');
        }
    }
    
    showFeedback(result, selectedIndex) {
        const feedbackArea = document.getElementById('feedbackArea');
        
        let feedbackHTML = `
            <div class="feedback ${result.correct ? 'correct' : 'incorrect'}">
                <div class="feedback-header">
                    <span class="feedback-icon">${result.correct ? '✅' : '❌'}</span>
                    <h3>${result.correct ? 'Correct!' : 'Incorrect'}</h3>
                </div>
                <div class="feedback-body">
                    ${result.correct 
                        ? `<p>+${result.points_earned} points! ${result.streak > 1 ? `🔥 ${result.streak}-question streak!` : ''}</p>`
                        : `<p>Correct answer: <strong>${this.currentQuestion.options[this.currentQuestion.correct]}</strong></p>`
                    }
                    <div class="explanation">
                        <h4>💡 Explanation</h4>
                        <p>${this.formatQuestionText(result.explanation)}</p>
                    </div>
                </div>
            </div>
        `;
        
        feedbackArea.innerHTML = feedbackHTML;
        hljs.highlightAll();
        
        // Show next button after delay
        setTimeout(() => {
            document.getElementById('nextBtn').style.display = 'block';
        }, 1500);
    }
    
    showCompletion(message) {
        document.getElementById('questionCard').innerHTML = `
            <div class="completion-screen">
                <div class="celebration">🎉</div>
                <h2>Quiz Completed!</h2>
                <p>${message}</p>
                <div class="final-stats">
                    <div class="stat-box">
                        <span class="stat-number">${this.score}</span>
                        <span class="stat-label">Total Points</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${this.level}</span>
                        <span class="stat-label">Level Reached</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${this.answeredCount}</span>
                        <span class="stat-label">Questions Answered</span>
                    </div>
                </div>
                <button id="restartBtn" class="btn btn-primary">Play Again</button>
            </div>
        `;
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.answeredCount = 0;
            this.loadQuestion();
        });
    }
    
    showError(message) {
        document.getElementById('feedbackArea').innerHTML = `
            <div class="feedback error">
                <div class="feedback-header">
                    <span class="feedback-icon">⚠️</span>
                    <h3>Error</h3>
                </div>
                <p>${message}</p>
            </div>
        `;
    }
    
    updateStats() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('streak').textContent = this.streak;
        document.getElementById('questionsCount').textContent = `${this.answeredCount}/20`;
        
        // Visual feedback for level up
        if (this.level > 1 && this.score >= (this.level - 1) * 100) {
            this.animateLevelUp();
        }
    }
    
    animateLevelUp() {
        const levelEl = document.getElementById('level');
        levelEl.classList.add('level-up');
        setTimeout(() => {
            levelEl.classList.remove('level-up');
        }, 1000);
    }
    
    initEventListeners() {
        // Next button
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.loadQuestion();
        });
        
        // Difficulty filters
        document.querySelectorAll('[data-difficulty]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setDifficulty(e.target.dataset.difficulty);
            });
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            e.target.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
        });
        
        // Restore theme preference
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').textContent = '☀️ Light Mode';
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CodeQuestGame();
    
    // Initialize syntax highlighting for static content
    hljs.highlightAll();
});