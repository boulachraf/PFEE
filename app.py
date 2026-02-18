import os
import json
import time
from flask import Flask, request, jsonify, render_template, send_file
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__, template_folder='.')
app.secret_key = os.getenv('FLASK_SECRET_KEY', os.urandom(24))

# Initialize AI Client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Store game sessions (In production, use a database like Redis/SQL)
sessions = {}

# Difficulty points mapping
DIFFICULTY_POINTS = {'easy': 10, 'medium': 20, 'hard': 30}

# ============================================================================
# ROUTES: Frontend Files (Securely served from root)
# ============================================================================

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/style.css')
def serve_css():
    return send_file('style.css', mimetype='text/css')

@app.route('/script.js')
def serve_js():
    return send_file('script.js', mimetype='application/javascript')

# ============================================================================
# ROUTES: API Endpoints
# ============================================================================

@app.route('/api/get_question')
def get_question():
    session_id = request.args.get('session_id', f'session_{int(time.time())}')
    topic = request.args.get('topic', 'General Knowledge')
    difficulty = request.args.get('difficulty', 'all')
    
    try:
        # Build prompt for AI
        difficulty_prompt = ""
        if difficulty != 'all':
            difficulty_prompt = f"Make it {difficulty} difficulty."
        
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": """You are an educational quiz game assistant. 
                Generate multiple-choice questions. 
                Output ONLY valid JSON in this exact format:
                {
                    "question": "The question text here",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct": 0,
                    "explanation": "Brief explanation of why this is correct",
                    "difficulty": "easy"
                }
                The "correct" field should be the INDEX (0-3) of the correct answer.
                Difficulty should be: easy, medium, or hard."""},
                {"role": "user", "content": f"Generate a multiple-choice question about {topic}. {difficulty_prompt}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        
        data = json.loads(completion.choices[0].message.content)
        
        # Validate required fields
        required_fields = ['question', 'options', 'correct', 'explanation']
        for field in required_fields:
            if field not in data:
                raise ValueError(f'Missing field: {field}')
        
        # Set difficulty if not provided
        if 'difficulty' not in data:
            data['difficulty'] = difficulty if difficulty != 'all' else 'medium'
        
        # Initialize session if needed
        if session_id not in sessions:
            sessions[session_id] = {
                'score': 0,
                'streak': 0,
                'level': 1,
                'answered': [],
                'start_time': time.time()
            }
        
        # Store correct answer in session (NOT sent to client)
        sessions[session_id]['current_correct'] = data['correct']
        sessions[session_id]['current_explanation'] = data['explanation']
        sessions[session_id]['current_difficulty'] = data['difficulty']
        
        # Prepare question data (remove correct answer from response)
        question_data = {
            'question': data['question'],
            'options': data['options'],
            'difficulty': data['difficulty']
        }
        
        return jsonify(question_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/check_answer', methods=['POST'])
def check_answer():
    data = request.get_json()
    session_id = data.get('session_id')
    selected_index = int(data.get('answer_index', -1))
    
    if session_id not in sessions:
        return jsonify({'error': 'Invalid session'}), 400
    
    session = sessions[session_id]
    
    if 'current_correct' not in session:
        return jsonify({'error': 'No active question'}), 400
    
    # Check answer
    correct_index = session['current_correct']
    is_correct = (selected_index == correct_index)
    
    # Get difficulty for scoring
    difficulty = session.get('current_difficulty', 'medium')
    
    # Update session stats
    if is_correct:
        points = DIFFICULTY_POINTS.get(difficulty, 10)
        streak_bonus = session['streak'] * 5 if session['streak'] > 0 else 0
        total_points = points + streak_bonus
        
        session['score'] += total_points
        session['streak'] += 1
        
        # Level up every 100 points
        session['level'] = (session['score'] // 100) + 1
    else:
        session['streak'] = 0
        total_points = 0
    
    # Clear current question data
    explanation = session.pop('current_explanation', 'No explanation available')
    session.pop('current_correct', None)
    session.pop('current_difficulty', None)
    
    return jsonify({
        'correct': is_correct,
        'correct_answer': correct_index,
        'explanation': explanation,
        'points_earned': total_points if is_correct else 0,
        'streak': session['streak'],
        'score': session['score'],
        'level': session['level'],
        'message': '✅ Correct! ' + (f'+{total_points} points!' if is_correct else '❌ Wrong!')
    })

@app.route('/api/leaderboard')
def get_leaderboard():
    leaderboard = [
        {'name': 'Alex', 'score': 420, 'level': 5},
        {'name': 'Sam', 'score': 380, 'level': 4},
        {'name': 'Taylor', 'score': 350, 'level': 4},
        {'name': 'Jordan', 'score': 310, 'level': 3},
    ]
    return jsonify(leaderboard)

if __name__ == '__main__':
    print("🚀 Starting AI Quiz Master...")
    print("📡 Make sure OPENAI_API_KEY is set in .env file")
    app.run(debug=True, host='0.0.0.0', port=5000)