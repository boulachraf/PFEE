let sessionId = 'session_' + Date.now();
let selectedOption = null;

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
        const response = await fetch(`/api/get_question?session_id=${sessionId}&topic=${encodeURIComponent(topic)}&difficulty=${difficulty}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        displayQuestion(data);
    } catch (error) {
        document.getElementById('question').textContent = '❌ Error: ' + error.message;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('question-container').style.display = 'block';
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
        alert('Please select an answer!');
        return;
    }

    document.getElementById('submit-btn').disabled = true;

    try {
        const response = await fetch('/api/check_answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                answer_index: selectedOption
            })
        });
        
        const result = await response.json();
        
        const feedbackEl = document.getElementById('feedback');
        feedbackEl.textContent = result.message;
        feedbackEl.className = 'feedback ' + (result.correct ? 'correct' : 'wrong');
        
        if (result.explanation) {
            feedbackEl.innerHTML += `<div class="explanation">💡 ${result.explanation}</div>`;
        }

        // Update stats
        document.getElementById('score').textContent = result.score;
        document.getElementById('level').textContent = result.level;
        document.getElementById('streak').innerHTML = result.streak + ' <span class="streak-fire">🔥</span>';

        // Highlight correct/wrong answers
        const optionBtns = document.querySelectorAll('.option-btn');
        optionBtns[result.correct_answer].classList.add('correct');
        if (!result.correct) {
            optionBtns[selectedOption].classList.add('wrong');
        }

        document.getElementById('submit-btn').style.display = 'none';
        document.getElementById('next-btn').style.display = 'inline-block';

    } catch (error) {
        console.error(error);
        alert('Error submitting answer');
        document.getElementById('submit-btn').disabled = false;
    }
}

// Load first question on page load
window.onload = loadQuestion;