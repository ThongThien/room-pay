import os
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

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


def validate_meter_reading(reading, meter_type):
    """
    Validate meter reading based on type
    - Electric meter: exactly 6 digits
    - Water meter: exactly 5 digits
    """
    if not reading:
        return False
    
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', reading)
    
    if meter_type == 'electric':
        return len(digits_only) == 6
    elif meter_type == 'water':
        return len(digits_only) == 5
    
    return False


def extract_meter_reading_with_gemini(image_path, meter_type):
    """
    Extract meter reading using Gemini API
    """
    try:
        # Open and load the image
        img = Image.open(image_path)
        
        # Create the model
        model = genai.GenerativeModel(GEMINI_MODEL)
        
        # Get prompt based on meter type from environment variables
        if meter_type == 'electric':
            prompt = ELECTRIC_METER_PROMPT
        else:  # water meter
            prompt = WATER_METER_PROMPT

        # Generate content
        response = model.generate_content([prompt, img])
        
        # Extract text from response
        reading = response.text.strip()
        
        # Check if model indicated unclear
        if 'UNCLEAR' in reading.upper():
            return None
        
        # Validate the reading
        if validate_meter_reading(reading, meter_type):
            # Return only digits
            return re.sub(r'\D', '', reading)
        else:
            return None
            
    except Exception as e:
        print(f"Error during OCR: {str(e)}")
        return None


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'ocr_backend': 'gemini',
        'model': GEMINI_MODEL
    }), 200


@app.route('/api/electric/upload', methods=['POST'])
def ocr_electric_meter():
    """
    OCR endpoint for electric meter (6 digits)
    """
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({
            'success': False,
            'error': 'No file provided'
        }), 400
    
    file = request.files['file']
    
    # Check if file is selected
    if file.filename == '':
        return jsonify({
            'success': False,
            'error': 'No file selected'
        }), 400
    
    # Check if file type is allowed
    if not allowed_file(file.filename):
        return jsonify({
            'success': False,
            'error': 'File type not allowed. Allowed types: ' + ', '.join(ALLOWED_EXTENSIONS)
        }), 400
    
    try:
        # Save file temporarily
        temp_path = save_temp_file(file)
        
        # Extract reading
        reading = extract_meter_reading_with_gemini(temp_path, 'electric')
        
        # Clean up if not preserving
        if not PRESERVE_UPLOADS:
            os.remove(temp_path)
        
        # Check if reading was successful
        if reading:
            return jsonify({
                'success': True,
                'meter_type': 'electric',
                'reading': reading,
                'digits': 6
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'IMAGE_QUALITY_TOO_LOW'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Processing error: {str(e)}'
        }), 500


@app.route('/api/water/upload', methods=['POST'])
def ocr_water_meter():
    """
    OCR endpoint for water meter (5 digits)
    """
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({
            'success': False,
            'error': 'No file provided'
        }), 400
    
    file = request.files['file']
    
    # Check if file is selected
    if file.filename == '':
        return jsonify({
            'success': False,
            'error': 'No file selected'
        }), 400
    
    # Check if file type is allowed
    if not allowed_file(file.filename):
        return jsonify({
            'success': False,
            'error': 'File type not allowed. Allowed types: ' + ', '.join(ALLOWED_EXTENSIONS)
        }), 400
    
    try:
        # Save file temporarily
        temp_path = save_temp_file(file)
        
        # Extract reading
        reading = extract_meter_reading_with_gemini(temp_path, 'water')
        
        # Clean up if not preserving
        if not PRESERVE_UPLOADS:
            os.remove(temp_path)
        
        # Check if reading was successful
        if reading:
            return jsonify({
                'success': True,
                'meter_type': 'water',
                'reading': reading,
                'digits': 5
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'IMAGE_QUALITY_TOO_LOW'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Processing error: {str(e)}'
        }), 500


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
