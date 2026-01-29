from flask import Flask, request, jsonify, render_template
import json
import random
import time
from collections import defaultdict

app = Flask(__name__)

# Load questions from JSON file
with open('questions.json', 'r') as f:
    QUESTIONS = json.load(f)['questions']

# Store game sessions
sessions = {}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/categories')
def get_categories():
    categories = sorted(set(q['category'] for q in QUESTIONS))
    return jsonify(categories)

@app.route('/api/get_question')
def get_question():
    session_id = request.args.get('session_id', f'session_{int(time.time())}')
    category = request.args.get('category', 'all')
    difficulty = request.args.get('difficulty', 'all')
    
    # Filter questions
    available = QUESTIONS
    if category != 'all':
        available = [q for q in available if q['category'] == category]
    if difficulty != 'all':
        available = [q for q in available if q['difficulty'] == difficulty]
    
    if not available:
        available = QUESTIONS  # Fallback to all questions
    
    # Get unanswered questions for this session
    if session_id in sessions and 'answered' in sessions[session_id]:
        answered_ids = sessions[session_id]['answered']
        available = [q for q in available if q['id'] not in answered_ids]
    
    if not available:
        return jsonify({
            'completed': True,
            'message': '🎉 You\'ve answered all questions in this category!'
        })
    
    # Select random question
    question = random.choice(available)
    
    # Initialize session if needed
    if session_id not in sessions:
        sessions[session_id] = {
            'score': 0,
            'streak': 0,
            'level': 1,
            'answered': [],
            'start_time': time.time()
        }
    
    # Store current question
    sessions[session_id]['current_question'] = question['id']
    
    # Prepare question data (remove correct answer)
    question_data = {
        'id': question['id'],
        'category': question['category'],
        'difficulty': question['difficulty'],
        'question': question['question'],
        'options': question['options'],
        'explanation': question.get('explanation', '')
    }
    
    return jsonify(question_data)

@app.route('/api/check_answer', methods=['POST'])
def check_answer():
    data = request.get_json()
    session_id = data.get('session_id')
    selected_index = int(data.get('answer_index', -1))
    
    if session_id not in sessions or 'current_question' not in sessions[session_id]:
        return jsonify({'error': 'Invalid session'}), 400
    
    # Find question
    question_id = sessions[session_id]['current_question']
    question = next((q for q in QUESTIONS if q['id'] == question_id), None)
    
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    # Check answer
    is_correct = (selected_index == question['correct'])
    
    # Update session stats
    session = sessions[session_id]
    session['answered'].append(question_id)
    
    if is_correct:
        # Points based on difficulty
        points = {'easy': 10, 'medium': 20, 'hard': 30}.get(question['difficulty'], 10)
        # Streak bonus
        streak_bonus = session['streak'] * 5 if session['streak'] > 0 else 0
        total_points = points + streak_bonus
        
        session['score'] += total_points
        session['streak'] += 1
        
        # Level up every 100 points
        if session['score'] >= session['level'] * 100:
            session['level'] += 1
    else:
        session['streak'] = 0
    
    return jsonify({
        'correct': is_correct,
        'correct_answer': question['correct'],
        'explanation': question.get('explanation', 'No explanation available'),
        'points_earned': total_points if is_correct else 0,
        'streak': session['streak'],
        'score': session['score'],
        'level': session['level']
    })

@app.route('/api/leaderboard')
def get_leaderboard():
    # In production, this would come from a database
    # For now, simulate with session data
    leaderboard = [
        {'name': 'Alex', 'score': 420, 'level': 5},
        {'name': 'Sam', 'score': 380, 'level': 4},
        {'name': 'Taylor', 'score': 350, 'level': 4},
        {'name': 'Jordan', 'score': 310, 'level': 3},
    ]
    return jsonify(leaderboard)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)