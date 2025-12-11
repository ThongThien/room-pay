import os
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv
from flasgger import Swagger, swag_from

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Swagger configuration
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/apispec.json',
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/swagger"
}

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Image Scan Service API",
        "description": "API for scanning electric and water meter readings using AI OCR",
        "version": "1.0.0",
        "contact": {
            "name": "API Support"
        }
    },
    "basePath": "/",
    "schemes": ["http", "https"],
    "consumes": ["multipart/form-data"],
    "produces": ["application/json"]
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

# Configuration from .env
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_UPLOAD_MB')) * 1024 * 1024
PRESERVE_UPLOADS = os.getenv('PRESERVE_UPLOADS').lower() == 'true'

# Gemini configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL')
GEMINI_TIMEOUT = int(os.getenv('GEMINI_TIMEOUT'))
ELECTRIC_METER_PROMPT = os.getenv('ELECTRIC_METER_PROMPT')
WATER_METER_PROMPT = os.getenv('WATER_METER_PROMPT')

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Allowed extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

# Meter type configurations
METER_CONFIGS = {
    'electric': {
        'expected_digits': 6,
        'return_digits': 5,
        'prompt': None,  # Will be set from env
        'note': 'Last digit removed from original 6-digit reading'
    },
    'water': {
        'expected_digits': 5,
        'return_digits': 4,
        'prompt': None,  # Will be set from env
        'note': 'Last digit removed from original 5-digit reading'
    }
}

# Set prompts from environment
METER_CONFIGS['electric']['prompt'] = ELECTRIC_METER_PROMPT
METER_CONFIGS['water']['prompt'] = WATER_METER_PROMPT

# Create upload folder if needed
UPLOAD_FOLDER = 'uploads'
if PRESERVE_UPLOADS and not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def save_temp_file(file):
    filename = secure_filename(file.filename)

    if PRESERVE_UPLOADS:
        temp_dir = UPLOAD_FOLDER
    else:
        import tempfile
        temp_dir = tempfile.gettempdir()

    temp_path = os.path.join(temp_dir, filename)
    file.save(temp_path)

    return temp_path

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_file_request(request):
    """Validate file upload request"""
    if 'file' not in request.files:
        return False, 'No file provided'
    
    file = request.files['file']
    
    if file.filename == '':
        return False, 'No file selected'
    
    if not allowed_file(file.filename):
        return False, f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
    
    return True, file


def validate_meter_reading(reading, meter_type):
    """Validate meter reading based on type"""
    if not reading:
        return False
    
    digits_only = re.sub(r'\D', '', reading)
    expected_digits = METER_CONFIGS[meter_type]['expected_digits']
    
    return len(digits_only) == expected_digits


def extract_meter_reading_with_gemini(image_path, meter_type):
    """Extract meter reading using Gemini API"""
    try:
        img = Image.open(image_path)
        model = genai.GenerativeModel(GEMINI_MODEL)
        prompt = METER_CONFIGS[meter_type]['prompt']

        response = model.generate_content([prompt, img])
        reading = response.text.strip()
        
        if 'UNCLEAR' in reading.upper():
            return None
        
        if validate_meter_reading(reading, meter_type):
            digits_only = re.sub(r'\D', '', reading)
            return digits_only[:-1] if len(digits_only) > 0 else None
        
        return None
            
    except Exception as e:
        print(f"Error during OCR: {str(e)}")
        return None


def process_meter_upload(meter_type):
    """Common logic for processing meter uploads"""
    # Validate request
    is_valid, result = validate_file_request(request)
    if not is_valid:
        return jsonify({'success': False, 'error': result}), 400
    
    file = result
    
    try:
        temp_path = save_temp_file(file)
        reading = extract_meter_reading_with_gemini(temp_path, meter_type)
        
        if not PRESERVE_UPLOADS:
            os.remove(temp_path)
        
        if reading:
            config = METER_CONFIGS[meter_type]
            return jsonify({
                'success': True,
                'meter_type': meter_type,
                'reading': reading,
                'digits': config['return_digits'],
                'note': config['note']
            }), 200
        else:
            return jsonify({'success': False, 'error': 'IMAGE_QUALITY_TOO_LOW'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': f'Processing error: {str(e)}'}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    ---
    tags:
      - Health
    responses:
      200:
        description: Service is healthy
        schema:
          type: object
          properties:
            status:
              type: string
              example: healthy
            ocr_backend:
              type: string
              example: gemini
            model:
              type: string
              example: gemini-2.5-pro
    """
    return jsonify({
        'status': 'healthy',
        'ocr_backend': 'gemini',
        'model': GEMINI_MODEL
    }), 200


@app.route('/api/electric/upload', methods=['POST'])
def ocr_electric_meter():
    """
    OCR endpoint for electric meter reading (returns 5 digits after removing last digit)
    ---
    tags:
      - Electric Meter
    consumes:
      - multipart/form-data
    parameters:
      - name: file
        in: formData
        type: file
        required: true
        description: Image file of electric meter (png, jpg, jpeg, gif, bmp, webp)
    responses:
      200:
        description: Successfully extracted meter reading
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            meter_type:
              type: string
              example: electric
            reading:
              type: string
              example: "12345"
            digits:
              type: integer
              example: 5
            note:
              type: string
              example: "Last digit removed from original 6-digit reading"
      400:
        description: Bad request - no file, invalid file type, or image quality too low
      413:
        description: File too large
      500:
        description: Internal server error
    """
    return process_meter_upload('electric')


@app.route('/api/water/upload', methods=['POST'])
def ocr_water_meter():
    """
    OCR endpoint for water meter reading (returns 4 digits after removing last digit)
    ---
    tags:
      - Water Meter
    consumes:
      - multipart/form-data
    parameters:
      - name: file
        in: formData
        type: file
        required: true
        description: Image file of water meter (png, jpg, jpeg, gif, bmp, webp)
    responses:
      200:
        description: Successfully extracted meter reading
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            meter_type:
              type: string
              example: water
            reading:
              type: string
              example: "1234"
            digits:
              type: integer
              example: 4
            note:
              type: string
              example: "Last digit removed from original 5-digit reading"
      400:
        description: Bad request - no file, invalid file type, or image quality too low
      413:
        description: File too large
      500:
        description: Internal server error
    """
    return process_meter_upload('water')


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error"""
    max_mb = int(os.getenv('MAX_UPLOAD_MB'))
    return jsonify({
        'success': False,
        'error': f'File too large. Maximum size is {max_mb}MB'
    }), 413


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)