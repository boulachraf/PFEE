from flask import Flask, request, jsonify
import random

app = Flask(__name__)

@app.route('/get_question')
def get_question():
    level = int(request.args.get('level', 1))
    max_num = 10 + (level * 5)  # Increase difficulty with level
    a = random.randint(1, max_num)
    b = random.randint(1, max_num)
    question = f"What is {a} + {b}?"
    answer = a + b
    return jsonify({'question': question, 'answer': answer})

@app.route('/check_answer', methods=['POST'])
def check_answer():
    data = request.get_json()
    user_answer = data['answer']
    correct_answer = data['correct']
    if user_answer == correct_answer:
        return jsonify({'correct': True, 'feedback': 'Correct! Great job!'})
    else:
        return jsonify({'correct': False, 'feedback': f'Wrong! The answer is {correct_answer}. Try again!'})

if __name__ == '__main__':
    app.run(debug=True)