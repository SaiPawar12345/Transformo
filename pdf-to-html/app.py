from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
import sys
import traceback
import tempfile
import logging
import fitz  # PyMuPDF
import base64
from bs4 import BeautifulSoup
import re
from PIL import Image
import io

# Configure logging
logging.basicConfig(level=logging.DEBUG, 
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

def extract_images(page):
    """Extract images from a PDF page."""
    image_list = []
    try:
        for image_index, img in enumerate(page.get_images(full=True)):
            try:
                xref = img[0]
                base_image = page.parent.extract_image(xref)
                image_data = base_image["image"]
                
                # Convert image data to base64
                image_base64 = base64.b64encode(image_data).decode('utf-8')
                image_type = base_image["ext"]
                
                # Get image position and size
                image_rect = page.get_image_bbox(img)
                if image_rect:
                    image_list.append({
                        'data': f'data:image/{image_type};base64,{image_base64}',
                        'width': image_rect.width,
                        'height': image_rect.height,
                        'top': image_rect.y0,
                        'left': image_rect.x0
                    })
            except Exception as e:
                logger.error(f'Error extracting image {image_index}: {str(e)}')
                continue
    except Exception as e:
        logger.error(f'Error in extract_images: {str(e)}')
    return image_list

def detect_tables(page):
    """Detect and extract tables from a PDF page."""
    try:
        tables = []
        blocks = page.get_text("dict")["blocks"]
        processed_spans = set()  # Track processed text spans
        
        # Group text blocks by vertical position
        rows = {}
        for block in blocks:
            if block.get("lines"):
                for line in block["lines"]:
                    for span in line["spans"]:
                        try:
                            # Create unique identifier for span
                            span_id = f"{span['text']}_{span['origin'][0]}_{span['origin'][1]}"
                            if span_id in processed_spans:
                                continue
                            
                            y_pos = round(span["origin"][1], 1)
                            if y_pos not in rows:
                                rows[y_pos] = []
                            
                            # Ensure color is a tuple of three values
                            color = span.get("color", (0, 0, 0))
                            if not isinstance(color, (tuple, list)):
                                color = (color, color, color)
                            elif len(color) != 3:
                                color = (color[0], color[0], color[0])
                            
                            rows[y_pos].append({
                                "text": span["text"],
                                "x": span["origin"][0],
                                "font": span.get("font", ""),
                                "size": span.get("size", 12),
                                "color": color,
                                "flags": span.get("flags", 0)
                            })
                            processed_spans.add(span_id)
                        except Exception as e:
                            logger.error(f'Error processing span: {str(e)}')
                            continue

        # Sort rows by vertical position
        sorted_rows = sorted(rows.items(), key=lambda x: -x[0])
        
        # Detect potential tables
        current_table = []
        min_cols = 3
        
        for y_pos, row in sorted_rows:
            try:
                if len(row) >= min_cols:
                    sorted_cells = sorted(row, key=lambda x: x["x"])
                    x_positions = [cell["x"] for cell in sorted_cells]
                    
                    if len(x_positions) > 1:
                        spacings = [x_positions[i+1] - x_positions[i] for i in range(len(x_positions)-1)]
                        avg_spacing = sum(spacings) / len(spacings)
                        
                        if all(abs(spacing - avg_spacing) < avg_spacing * 0.5 for spacing in spacings):
                            current_table.append(sorted_cells)
                        elif current_table and len(current_table) >= 2:
                            tables.append(current_table)
                            current_table = []
                elif current_table and len(current_table) >= 2:
                    tables.append(current_table)
                    current_table = []
            except Exception as e:
                logger.error(f'Error processing row: {str(e)}')
                continue
        
        if current_table and len(current_table) >= 2:
            tables.append(current_table)
        
        return tables
    except Exception as e:
        logger.error(f'Error in detect_tables: {str(e)}')
        return []

def create_html_content(page, images, tables):
    """Create HTML content from PDF page elements."""
    try:
        processed_text = set()
        html_content = ""
        
        # Add images
        for img in images:
            try:
                html_content += f'''
                <div class="pdf-image" style="position: absolute; top: {img['top']}px; left: {img['left']}px;">
                    <img src="{img['data']}" style="width: {img['width']}px; height: {img['height']}px; max-width: 100%;" alt="PDF content"/>
                </div>
                '''
            except Exception as e:
                logger.error(f'Error adding image to HTML: {str(e)}')
                continue
        
        # Process tables
        for table in tables:
            try:
                html_content += '<div class="table-container">'
                html_content += '<table class="pdf-table">'
                
                # Header row
                if table and len(table) > 0:
                    html_content += '<thead><tr>'
                    for cell in table[0]:
                        text_id = f"{cell['text']}_{cell['x']}"
                        processed_text.add(text_id)
                        
                        color = f"rgb({int(cell['color'][0]*255)}, {int(cell['color'][1]*255)}, {int(cell['color'][2]*255)})"
                        style = f'''
                            font-family: {cell["font"] or "Arial"};
                            font-size: {cell["size"]}px;
                            color: {color};
                            font-weight: {cell["flags"] & 2 and "bold" or "normal"};
                            font-style: {cell["flags"] & 1 and "italic" or "normal"};
                        '''
                        html_content += f'<th style="{style}">{cell["text"]}</th>'
                    html_content += '</tr></thead><tbody>'
                    
                    # Data rows
                    for row in table[1:]:
                        html_content += '<tr>'
                        for cell in row:
                            text_id = f"{cell['text']}_{cell['x']}"
                            processed_text.add(text_id)
                            
                            color = f"rgb({int(cell['color'][0]*255)}, {int(cell['color'][1]*255)}, {int(cell['color'][2]*255)})"
                            style = f'''
                                font-family: {cell["font"] or "Arial"};
                                font-size: {cell["size"]}px;
                                color: {color};
                                font-weight: {cell["flags"] & 2 and "bold" or "normal"};
                                font-style: {cell["flags"] & 1 and "italic" or "normal"};
                            '''
                            html_content += f'<td style="{style}">{cell["text"]}</td>'
                        html_content += '</tr>'
                
                html_content += '</tbody></table></div>'
            except Exception as e:
                logger.error(f'Error processing table: {str(e)}')
                continue
        
        # Process remaining text
        try:
            blocks = page.get_text("dict")["blocks"]
            for block in blocks:
                if block.get("lines"):
                    html_content += '<div class="text-block">'
                    for line in block["lines"]:
                        for span in line["spans"]:
                            try:
                                text_id = f"{span['text']}_{span['origin'][0]}"
                                if text_id not in processed_text and span['text'].strip():
                                    color = span.get('color', 0)
                                    if isinstance(color, (int, float)):
                                        color = (color, color, color)
                                    color_str = f"rgb({int(color[0]*255)}, {int(color[1]*255)}, {int(color[2]*255)})"
                                    
                                    style = f'''
                                        font-family: {span.get("font", "Arial")};
                                        font-size: {span.get("size", 12)}px;
                                        color: {color_str};
                                        font-weight: {span.get("flags", 0) & 2 and "bold" or "normal"};
                                        font-style: {span.get("flags", 0) & 1 and "italic" or "normal"};
                                        position: absolute;
                                        left: {span['origin'][0]}px;
                                        top: {span['origin'][1]}px;
                                    '''
                                    html_content += f'<span style="{style}">{span["text"]}</span>'
                            except Exception as e:
                                logger.error(f'Error processing text span: {str(e)}')
                                continue
                        html_content += '<br/>'
                    html_content += '</div>'
        except Exception as e:
            logger.error(f'Error processing text blocks: {str(e)}')
        
        return html_content
    except Exception as e:
        logger.error(f'Error in create_html_content: {str(e)}')
        return ""

@app.route('/api/convert/pdf-to-html', methods=['POST'])
def convert_pdf_to_html():
    temp_dir = None
    try:
        logger.info('Received PDF to HTML conversion request')
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
        html_path = os.path.join(temp_dir, 'output.html')

        try:
            # Save uploaded file
            file.save(pdf_path)
            logger.info(f'Saved PDF to: {pdf_path}')
            
            # Open PDF
            doc = fitz.open(pdf_path)
            logger.info(f'Opened PDF with {len(doc)} pages')
            
            # Create HTML document with base styles
            html_content = '''<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Converted PDF</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        line-height: 1.6; 
                        margin: 40px;
                        position: relative;
                    }
                    .page { 
                        position: relative;
                        border-bottom: 1px solid #ccc;
                        margin-bottom: 30px;
                        padding-bottom: 30px;
                        min-height: 1000px;
                    }
                    .page:last-child { 
                        border-bottom: none; 
                    }
                    .table-container {
                        margin: 15px 0;
                        width: 100%;
                    }
                    .pdf-table { 
                        border-collapse: collapse;
                        width: 100%;
                        table-layout: fixed;
                    }
                    .pdf-table th, .pdf-table td { 
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    .pdf-table th { 
                        background-color: #f5f5f5;
                    }
                    .pdf-image { 
                        margin: 15px 0;
                    }
                    .pdf-image img { 
                        max-width: 100%;
                        height: auto;
                    }
                    .text-block {
                        position: relative;
                        width: 100%;
                        min-height: 1em;
                    }
                    span {
                        display: inline-block;
                    }
                </style>
            </head>
            <body>'''
            
            # Process each page
            for page_num in range(len(doc)):
                logger.info(f'Processing page {page_num + 1}')
                page = doc[page_num]
                
                html_content += f'<div class="page"><h2>Page {page_num + 1}</h2>'
                
                try:
                    # Extract images
                    images = extract_images(page)
                    logger.info(f'Extracted {len(images)} images from page {page_num + 1}')
                    
                    # Detect tables
                    tables = detect_tables(page)
                    logger.info(f'Detected {len(tables)} tables on page {page_num + 1}')
                    
                    # Create page content
                    page_content = create_html_content(page, images, tables)
                    html_content += page_content
                except Exception as e:
                    logger.error(f'Error processing page {page_num + 1}: {str(e)}')
                
                html_content += '</div>'
            
            html_content += '</body></html>'
            
            # Save HTML content
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            logger.info('Saved HTML content')
            
            # Send the converted file
            return send_file(
                html_path,
                mimetype='text/html',
                as_attachment=True,
                download_name=os.path.splitext(file.filename)[0] + '.html'
            )

        except Exception as conversion_error:
            error_info = {
                'error': str(conversion_error),
                'traceback': traceback.format_exc()
            }
            logger.error(f'Conversion error: {error_info}')
            return jsonify(error_info), 500

    except Exception as e:
        error_info = {
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        logger.error(f'Request error: {error_info}')
        return jsonify(error_info), 500

    finally:
        # Clean up temporary files
        if temp_dir:
            try:
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
                if os.path.exists(html_path):
                    os.remove(html_path)
                os.rmdir(temp_dir)
                logger.info('Cleaned up temporary files')
            except Exception as cleanup_error:
                logger.error(f'Error during cleanup: {cleanup_error}')

if __name__ == '__main__':
    logger.info('Starting Flask server on port 5006')
    app.run(host='0.0.0.0', port=5006, debug=True)
