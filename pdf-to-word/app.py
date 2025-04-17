from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
import sys
import traceback
from pdf2docx import Converter
import tempfile
import logging
from pdf2docx.main import parse
import fitz  # PyMuPDF

# Configure logging
logging.basicConfig(level=logging.DEBUG, 
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF while maintaining formatting."""
    doc = fitz.open(pdf_path)
    text_content = []
    
    for page in doc:
        text_content.append(page.get_text("text"))
    
    doc.close()
    return "\n".join(text_content)

@app.route('/api/convert/pdf-to-word', methods=['POST'])
def convert_pdf_to_word():
    try:
        logger.info('Received conversion request')
        if 'file' not in request.files:
            logger.error('No file provided in request')
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            logger.error('No file selected')
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            logger.error('Invalid file format')
            return jsonify({'error': 'Invalid file format. Please upload a PDF file'}), 400

        logger.info(f'Processing file: {file.filename}')

        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        pdf_path = os.path.join(temp_dir, 'input.pdf')
        docx_path = os.path.join(temp_dir, 'output.docx')

        try:
            # Save uploaded file
            logger.info(f'Saving PDF to: {pdf_path}')
            file.save(pdf_path)

            # Extract text content
            logger.info('Extracting text content')
            text_content = extract_text_from_pdf(pdf_path)
            
            # Convert PDF to DOCX with enhanced text extraction
            logger.info('Starting conversion')
            cv = Converter(pdf_path)
            cv.convert(docx_path, start=0, end=None, multi_processing=True)
            cv.close()
            logger.info('Conversion completed')

            # Send the converted file
            return send_file(
                docx_path,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                as_attachment=True,
                download_name=os.path.splitext(file.filename)[0] + '.docx'
            )

        except Exception as conversion_error:
            error_info = {
                'error': str(conversion_error),
                'traceback': traceback.format_exc()
            }
            logger.error(f'Conversion error: {error_info}')
            return jsonify(error_info), 500

        finally:
            # Clean up temporary files
            try:
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
                if os.path.exists(docx_path):
                    os.remove(docx_path)
                os.rmdir(temp_dir)
                logger.info('Cleaned up temporary files')
            except Exception as cleanup_error:
                logger.error(f'Error during cleanup: {cleanup_error}')

    except Exception as e:
        error_info = {
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        logger.error(f'Request error: {error_info}')
        return jsonify(error_info), 500

if __name__ == '__main__':
    logger.info('Starting Flask server on port 5005')
    app.run(host='0.0.0.0', port=5005, debug=True)
