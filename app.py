import os
import json
import time
import hashlib
from flask import Flask, request, jsonify, render_template, send_file
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, template_folder='.')
app.secret_key = os.getenv('FLASK_SECRET_KEY', os.urandom(24))

client = OpenAI(
    api_key=os.getenv('GROQ_API_KEY'),
    base_url="https://api.groq.com/openai/v1"
)

sessions = {}
DIFFICULTY_POINTS = {'easy': 10, 'medium': 20, 'hard': 30}

# Language names for AI prompt
LANGUAGE_NAMES = {
    'en': 'English',
    'fr': 'French',
    'ar': 'Arabic'
}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/style.css')
def serve_css():
    return send_file('style.css', mimetype='text/css')

@app.route('/script.js')
def serve_js():
    return send_file('script.js', mimetype='application/javascript')

@app.route('/api/get_question')
def get_question():
    session_id = request.args.get('session_id', f'session_{int(time.time())}')
    topic = request.args.get('topic', 'General Knowledge')
    difficulty = request.args.get('difficulty', 'all')
    language = request.args.get('language', 'en')  # ✅ NEW: Get language
    
    try:
        if session_id not in sessions:
            sessions[session_id] = {
                'score': 0,
                'streak': 0,
                'level': 1,
                'answered': [],
                'start_time': time.time(),
                'asked_hashes': []
            }
        
        session = sessions[session_id]
        
        # Build "avoid these" context
        avoid_prompt = ""
        if 'asked_hashes' in session and session['asked_hashes']:
            recent = session['asked_hashes'][-10:]
            avoid_list = "\n".join([f"- {q}" for q in recent])
            avoid_prompt = f"\n\n⚠️ DO NOT repeat or rephrase these questions:\n{avoid_list}"
        
        difficulty_prompt = ""
        if difficulty != 'all':
            difficulty_prompt = f"Make it {difficulty} difficulty."
        
        # ✅ Get language name for prompt
        lang_name = LANGUAGE_NAMES.get(language, 'English')
        
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""You are an educational quiz game assistant. 
                Generate multiple-choice questions in {lang_name}.
                Output ONLY valid JSON in this exact format:
                {{
                    "question": "The question text here",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct": 0,
                    "explanation": "Brief explanation of why this is correct",
                    "difficulty": "easy"
                }}
                The "correct" field should be the INDEX (0-3) of the correct answer.
                Difficulty should be: easy, medium, or hard.
                IMPORTANT: Never repeat questions, even with different wording.
                ALL content (question, options, explanation) must be in {lang_name}."""},
                {"role": "user", "content": f"Generate a multiple-choice question about {topic}. {difficulty_prompt}{avoid_prompt}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.85
        )
        
        data = json.loads(completion.choices[0].message.content)
        
        required_fields = ['question', 'options', 'correct', 'explanation']
        for field in required_fields:
            if field not in data:
                raise ValueError(f'Missing field: {field}')
        
        if 'difficulty' not in data:
            data['difficulty'] = difficulty if difficulty != 'all' else 'medium'
        
        question_hash = hashlib.md5(data['question'].lower().strip().encode()).hexdigest()
        
        if 'asked_hashes' not in session:
            session['asked_hashes'] = []
        if len(session['asked_hashes']) >= 30:
            session['asked_hashes'] = session['asked_hashes'][-29:]
        session['asked_hashes'].append(data['question'][:100])
        
        session['current_correct'] = data['correct']
        session['current_explanation'] = data['explanation']
        session['current_difficulty'] = data['difficulty']
        session['current_hash'] = question_hash
        
        question_data = {
            'question': data['question'],
            'options': data['options'],
            'difficulty': data['difficulty']
        }
        
        return jsonify(question_data)
        
    except Exception as e:
        print(f"❌ Error in get_question: {e}")
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
    
    correct_index = session['current_correct']
    is_correct = (selected_index == correct_index)
    
    difficulty = session.get('current_difficulty', 'medium')
    
    if is_correct:
        points = DIFFICULTY_POINTS.get(difficulty, 10)
        streak_bonus = session['streak'] * 5 if session['streak'] > 0 else 0
        total_points = points + streak_bonus
        
        session['score'] += total_points
        session['streak'] += 1
        session['level'] = (session['score'] // 100) + 1
    else:
        session['streak'] = 0
        total_points = 0
    
    explanation = session.pop('current_explanation', 'No explanation available')
    session.pop('current_correct', None)
    session.pop('current_difficulty', None)
    session.pop('current_hash', None)
    
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

@app.route('/api/reset_session')
def reset_session():
    session_id = request.args.get('session_id')
    if session_id and session_id in sessions:
        sessions[session_id]['asked_hashes'] = []
        return jsonify({'message': 'Session history cleared'})
    return jsonify({'error': 'Invalid session'}), 400

if __name__ == '__main__':
    print("🚀 Starting AI Quiz Master...")
    print("🌍 Multi-language support: English, French, Arabic")
    print("📡 Groq API configured - make sure GROQ_API_KEY is set in .env")
    app.run(debug=True, host='0.0.0.0', port=5000)