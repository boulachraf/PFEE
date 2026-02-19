// ============================================================================
// LANGUAGE TRANSLATIONS
// ============================================================================
const translations = {
    en: {
        title: "🎓 AI Quiz Master",
        score: "Score",
        level: "Level",
        streak: "Streak",
        topic_placeholder: "Topic (e.g., Python, History, Science)",
        all_difficulties: "All Difficulties",
        easy: "Easy",
        medium: "Medium",
        hard: "Hard",
        new_question: "🔄 New Question",
        ai_generating: "🤖 AI is generating your question...",
        submit_answer: "Submit Answer",
        next_question: "Next Question ➡️",
        clear_history: "🗑️ Clear History",
        session: "Session",
        select_answer: "Please select an answer!",
        error_submit: "Error submitting answer",
        error_load: "❌ Error: ",
        correct: "✅ Correct! ",
        wrong: "❌ Wrong!",
        points: "+{points} points!",
        no_explanation: "No explanation available",
        duplicate_retry: "⚠️ Duplicate detected, retrying...",
        history_cleared: "🧹 History cleared!"
    },
    fr: {
        title: "🎓 Maître du Quiz IA",
        score: "Score",
        level: "Niveau",
        streak: "Série",
        topic_placeholder: "Sujet (ex: Python, Histoire, Science)",
        all_difficulties: "Toutes Difficultés",
        easy: "Facile",
        medium: "Moyen",
        hard: "Difficile",
        new_question: "🔄 Nouvelle Question",
        ai_generating: "🤖 L'IA génère votre question...",
        submit_answer: "Valider la Réponse",
        next_question: "Question Suivante ➡️",
        clear_history: "🗑️ Effacer l'Historique",
        session: "Session",
        select_answer: "Veuillez sélectionner une réponse !",
        error_submit: "Erreur lors de la soumission",
        error_load: "❌ Erreur: ",
        correct: "✅ Correct ! ",
        wrong: "❌ Faux !",
        points: "+{points} points !",
        no_explanation: "Aucune explication disponible",
        duplicate_retry: "⚠️ Doublon détecté, réessai...",
        history_cleared: "🧹 Historique effacé !"
    },
    ar: {
        title: "🎓 معلم الاختبار بالذكاء الاصطناعي",
        score: "النقاط",
        level: "المستوى",
        streak: "التتابع",
        topic_placeholder: "الموضوع (مثال: بايثون، تاريخ، علوم)",
        all_difficulties: "كل الصعوبات",
        easy: "سهل",
        medium: "متوسط",
        hard: "صعب",
        new_question: "🔄 سؤال جديد",
        ai_generating: "🤖 الذكاء الاصطناعي يولد سؤالك...",
        submit_answer: "تأكيد الإجابة",
        next_question: "السؤال التالي ⬅️",
        clear_history: "🗑️ مسح السجل",
        session: "الجلسة",
        select_answer: "الرجاء اختيار إجابة!",
        error_submit: "خطأ في إرسال الإجابة",
        error_load: "❌ خطأ: ",
        correct: "✅ صحيح! ",
        wrong: "❌ خطأ!",
        points: "+{points} نقاط!",
        no_explanation: "لا يوجد شرح متاح",
        duplicate_retry: "⚠️ تم اكتشاف تكرار، إعادة المحاولة...",
        history_cleared: "🧹 تم مسح السجل!"
    }
};

// Current language (default: English)
let currentLanguage = 'en';

// ============================================================================
// LANGUAGE FUNCTIONS
// ============================================================================

function loadSavedLanguage() {
    const saved = localStorage.getItem('quiz_language');
    if (saved && translations[saved]) {
        currentLanguage = saved;
        document.getElementById('language-select').value = saved;
        applyLanguage(currentLanguage);
    }
}

function changeLanguage() {
    const lang = document.getElementById('language-select').value;
    currentLanguage = lang;
    localStorage.setItem('quiz_language', lang);
    applyLanguage(lang);
    
    // Reload question in new language
    if (window.sessionId) {
        loadQuestion();
    }
}

function applyLanguage(lang) {
    // Update HTML direction for Arabic (RTL)
    if (lang === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
        document.body.classList.add('rtl');
    } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', lang);
        document.body.classList.remove('rtl');
    }
    
    // Translate all elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
    
    // Translate placeholders
    document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
        const key = el.getAttribute('data-translate-placeholder');
        if (translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });
    
    // Update title
    document.title = translations[lang]['title'];
}

function t(key, params = {}) {
    let text = translations[currentLanguage][key] || translations['en'][key] || key;
    // Replace placeholders like {points}
    for (const [param, value] of Object.entries(params)) {
        text = text.replace(`{${param}}`, value);
    }
    return text;
}

// ============================================================================
// DUPLICATE PREVENTION
// ============================================================================
let askedQuestionCache = new Set();
const MAX_CACHE_SIZE = 30;

function simpleHash(str) {
    let hash = 0;
    const cleanStr = str.toLowerCase().trim().replace(/\s+/g, ' ');
    for (let i = 0; i < cleanStr.length; i++) {
        hash = ((hash << 5) - hash) + cleanStr.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString(36);
}

function isDuplicateQuestion(question) {
    const hash = simpleHash(question);
    if (askedQuestionCache.has(hash)) {
        return true;
    }
    const short = question.toLowerCase().trim().substring(0, 50);
    for (let cached of askedQuestionCache) {
        if (typeof cached === 'string' && cached.startsWith(short.substring(0, 30))) {
            return true;
        }
    }
    return false;
}

function cacheQuestion(question) {
    const hash = simpleHash(question);
    askedQuestionCache.add(hash);
    askedQuestionCache.add(question.toLowerCase().trim().substring(0, 50));
    if (askedQuestionCache.size > MAX_CACHE_SIZE * 2) {
        const arr = Array.from(askedQuestionCache);
        askedQuestionCache = new Set(arr.slice(-MAX_CACHE_SIZE));
    }
}

function clearQuestionCache() {
    askedQuestionCache.clear();
}

// ============================================================================
// MAIN GAME LOGIC
// ============================================================================
let selectedOption = null;
let retryCount = 0;
const MAX_RETRIES = 3;

async function loadQuestion() {
    const topic = document.getElementById('topic').value || 'General Knowledge';
    const difficulty = document.getElementById('difficulty').value;
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('question-container').style.display = 'none';
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('submit-btn').style.display = 'inline-block';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('submit-btn').disabled = true;

    try {
        // ✅ Send language to backend for AI question generation
        const response = await fetch(`/api/get_question?session_id=${window.sessionId}&topic=${encodeURIComponent(topic)}&difficulty=${difficulty}&language=${currentLanguage}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        if (isDuplicateQuestion(data.question)) {
            console.log(t('duplicate_retry'));
            retryCount++;
            
            if (retryCount < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return loadQuestion();
            } else {
                console.warn('Max retries reached');
                retryCount = 0;
            }
        }
        
        retryCount = 0;
        cacheQuestion(data.question);
        displayQuestion(data);
    } catch (error) {
        document.getElementById('question').textContent = t('error_load') + error.message;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('question-container').style.display = 'block';
        console.error('Load question error:', error);
    }
}

function displayQuestion(data) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('question-container').style.display = 'block';
    document.getElementById('question').textContent = data.question;
    
    const optionsEl = document.getElementById('options');
    optionsEl.innerHTML = '';
    
    data.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.classList.add('option-btn');
        btn.onclick = () => selectOption(btn, index);
        optionsEl.appendChild(btn);
    });
    
    document.getElementById('submit-btn').disabled = false;
    selectedOption = null;
}

function selectOption(btn, index) {
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedOption = index;
}

async function submitAnswer() {
    if (selectedOption === null) {
        alert(t('select_answer'));
        return;
    }

    document.getElementById('submit-btn').disabled = true;

    try {
        const response = await fetch('/api/check_answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: window.sessionId,
                answer_index: selectedOption
            })
        });
        
        const result = await response.json();
        
        const feedbackEl = document.getElementById('feedback');
        
        // ✅ Translate feedback message
        let message = result.correct ? t('correct') : t('wrong');
        if (result.correct && result.points_earned > 0) {
            message += t('points', { points: result.points_earned });
        }
        
        feedbackEl.textContent = message;
        feedbackEl.className = 'feedback ' + (result.correct ? 'correct' : 'wrong');
        
        if (result.explanation) {
            feedbackEl.innerHTML += `<div class="explanation">💡 ${result.explanation}</div>`;
        }

        document.getElementById('score').textContent = result.score;
        document.getElementById('level').textContent = result.level;
        document.getElementById('streak').innerHTML = result.streak + ' <span class="streak-fire">🔥</span>';

        const optionBtns = document.querySelectorAll('.option-btn');
        if (result.correct_answer >= 0 && result.correct_answer < optionBtns.length) {
            optionBtns[result.correct_answer].classList.add('correct');
        }
        if (!result.correct && selectedOption >= 0 && selectedOption < optionBtns.length) {
            optionBtns[selectedOption].classList.add('wrong');
        }

        document.getElementById('submit-btn').style.display = 'none';
        document.getElementById('next-btn').style.display = 'inline-block';

    } catch (error) {
        console.error(error);
        alert(t('error_submit'));
        document.getElementById('submit-btn').disabled = false;
    }
}

function resetSession() {
    clearQuestionCache();
    fetch(`/api/reset_session?session_id=${window.sessionId}`)
        .then(() => console.log(t('history_cleared')))
        .catch(err => console.warn('Could not clear server history:', err));
    loadQuestion();
    alert(t('history_cleared'));
}

// Make functions globally available
window.loadQuestion = loadQuestion;
window.submitAnswer = submitAnswer;
window.selectOption = selectOption;
window.resetSession = resetSession;
window.changeLanguage = changeLanguage;
window.clearQuestionCache = clearQuestionCache;

// Load first question on page load
window.onload = loadQuestion;