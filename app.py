from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from PyPDF2 import PdfReader
import docx
import os
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def allowed_file(filename):
    """Check if the uploaded file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def read_file_content(file_path):
    """Read file content based on its type."""
    if file_path.endswith('.txt'):
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    elif file_path.endswith('.pdf'):
        content = []
        pdf_reader = PdfReader(file_path)
        for page in pdf_reader.pages:
            content.append(page.extract_text())
        return " ".join(content)
    elif file_path.endswith('.docx'):
        doc = docx.Document(file_path)
        return " ".join(paragraph.text for paragraph in doc.paragraphs)
    else:
        raise ValueError("Unsupported file format. Please upload a .txt, .pdf, or .docx file.")


def sentiment_analysis_vader(content):
    """Perform sentiment analysis and determine influential words."""
    analyzer = SentimentIntensityAnalyzer()
    word_impact = []
    sentiment_scores = {'neg': 0, 'neu': 0, 'pos': 0, 'compound': 0}

    words = content.split()

    for word in words:
        sentiment = analyzer.polarity_scores(word)
        impact_score = abs(sentiment['compound'])
        word_impact.append({'word': word, 'impact': impact_score, 'sentiment': sentiment['compound']})

        # Aggregate overall sentiment scores
        sentiment_scores['neg'] += sentiment['neg']
        sentiment_scores['neu'] += sentiment['neu']
        sentiment_scores['pos'] += sentiment['pos']
        sentiment_scores['compound'] += sentiment['compound']

    word_count = len(words)
    if word_count > 0:
        sentiment_scores = {k: v / word_count for k, v in sentiment_scores.items()}

    conclusion = "neutral"
    if sentiment_scores['compound'] > 0.05:
        conclusion = "positive"
    elif sentiment_scores['compound'] < -0.05:
        conclusion = "negative"

    influential_words = sorted(word_impact, key=lambda x: x['impact'], reverse=True)[:10]
    return {
        'sentiment_scores': sentiment_scores,
        'influential_words': influential_words,
        'conclusion': conclusion,
    }


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            content = read_file_content(file_path)
            analysis_result = sentiment_analysis_vader(content)
            return jsonify(analysis_result), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'Unsupported file format'}), 400


if __name__ == '__main__':
    app.run(debug=True)
