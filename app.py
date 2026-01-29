from flask import Flask, request, jsonify, render_template
import random
import time

app = Flask(__name__)

# Store game sessions (in production, use database)
sessions = {}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_question')
def get_question():
    level = int(request.args.get('level', 1))
    session_id = request.args.get('session_id', 'default')
    
    # Difficulty scaling
    max_num = 10 + (level * 5)
    
    # Question types based on level
    if level <= 2:
        # Addition only
        a = random.randint(1, max_num)
        b = random.randint(1, max_num)
        question = f"What is {a} + {b}?"
        answer = a + b
        operation = 'addition'
    elif level <= 4:
        # Addition and subtraction
        a = random.randint(1, max_num)
        b = random.randint(1, max_num)
        if random.choice([True, False]):
            question = f"What is {a} + {b}?"
            answer = a + b
            operation = 'addition'
        else:
            question = f"What is {a + b} - {b}?"
            answer = a
            operation = 'subtraction'
    else:
        # Addition, subtraction, multiplication
        op = random.choice(['+', '-', '*'])
        a = random.randint(1, max_num)
        b = random.randint(1, max_num)
        
        if op == '+':
            question = f"What is {a} + {b}?"
            answer = a + b
            operation = 'addition'
        elif op == '-':
            question = f"What is {a + b} - {b}?"
            answer = a
            operation = 'subtraction'
        else:
            question = f"What is {a} × {b}?"
            answer = a * b
            operation = 'multiplication'
    
    # Store question for validation
    sessions[session_id] = {
        'question': question,
        'answer': answer,
        'operation': operation,
        'level': level,
        'timestamp': time.time()
    }
    
    return jsonify({
        'question': question,
        'operation': operation,
        'level': level,
        'max_num': max_num
    })

@app.route('/check_answer', methods=['POST'])
def check_answer():
    data = request.get_json()
    session_id = data.get('session_id', 'default')
    user_answer = int(data['answer'])
    
    if session_id not in sessions:
        return jsonify({
            'correct': False,
            'feedback': 'Session expired. Please refresh!',
            'new_question': True
        })
    
    correct_answer = sessions[session_id]['answer']
    operation = sessions[session_id]['operation']
    level = sessions[session_id]['level']
    
    is_correct = user_answer == correct_answer
    
    # Generate encouraging feedback
    if is_correct:
        feedbacks = [
            '🎉 Correct! Great job!',
            '🌟 Awesome! Keep it up!',
            '✅ Perfect! You\'re amazing!',
            '🔥 Excellent! Next level!',
            '✨ Brilliant! Keep going!'
        ]
    else:
        feedbacks = [
            f'❌ Wrong! The answer is {correct_answer}. Try again!',
            f'🤔 Not quite! {correct_answer} is the correct answer.',
            f'💡 Oops! It\'s {correct_answer}. Don\'t give up!',
            f'🎯 Close! The answer is {correct_answer}.'
        ]
    
    feedback = random.choice(feedbacks)
    
    return jsonify({
        'correct': is_correct,
        'feedback': feedback,
        'correct_answer': correct_answer,
        'operation': operation,
        'level': level
    })

@app.route('/get_stats/<session_id>')
def get_stats(session_id):
    # In production, fetch from database
    return jsonify({
        'total_questions': 0,
        'correct_answers': 0,
        'current_streak': 0
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)