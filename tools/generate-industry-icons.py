#!/usr/bin/env python3
"""
Generate industry icons using Amazon Bedrock Nova Canvas
Creates professional industry icons for 5 industries in AnyCompany CRM
"""

import boto3
import json
import base64
import time
import os
from pathlib import Path

# Configuration
OUTPUT_DIR = "lib/stacks/frontend/app/public/crm/icons"
REGION = "us-east-1"
MODEL_ID = "amazon.nova-canvas-v1:0"

# Create output directory
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

# Initialize Bedrock client
bedrock = boto3.client('bedrock-runtime', region_name=REGION)

def generate_image(filename, prompt, counter, total):
    """Generate a single image using Bedrock Nova Canvas"""
    output_path = os.path.join(OUTPUT_DIR, filename)
    
    print(f"[{counter}/{total}] Generating: {filename}")
    print(f"Prompt: {prompt[:100]}...")
    
    # Create request body
    request_body = {
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {
            "text": prompt
        },
        "imageGenerationConfig": {
            "numberOfImages": 1,
            "quality": "standard",
            "height": 320,
            "width": 320,
            "cfgScale": 8.0
        }
    }
    
    try:
        # Call Bedrock API
        response = bedrock.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps(request_body)
        )
        
        # Parse response
        response_body = json.loads(response['body'].read())
        
        # Extract and decode image
        image_data = base64.b64decode(response_body['images'][0])
        
        # Save image
        with open(output_path, 'wb') as f:
            f.write(image_data)
        
        file_size = len(image_data) // 1024
        print(f"✅ Saved: {output_path} ({file_size} KB)")
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print()
        return False

def main():
    print("🎨 Generating industry icons using Amazon Bedrock Nova Canvas")
    print(f"📁 Output directory: {OUTPUT_DIR}")
    print("⏱️  Rate limit: 1 image per 30 seconds")
    print()
    
    # 5 industry icons matching CRM types
    industries = [
        ("technology.png", "Simple modern icon for technology industry, circuit board pattern with microchip, blue color scheme, minimalist flat design, white background, professional style"),
        ("healthcare.png", "Simple modern icon for healthcare industry, medical cross with heart symbol, green and teal color scheme, minimalist flat design, white background, professional style"),
        ("finance.png", "Simple modern icon for finance industry, dollar sign with upward trending arrow, navy blue and gold color scheme, minimalist flat design, white background, professional style"),
        ("retail.png", "Simple modern icon for retail industry, shopping cart with storefront, orange and blue color scheme, minimalist flat design, white background, professional style"),
        ("manufacturing.png", "Simple modern icon for manufacturing industry, factory building with gear symbol, blue and gray color scheme, minimalist flat design, white background, professional style"),
    ]
    
    total = len(industries)
    success_count = 0
    
    for counter, (filename, prompt) in enumerate(industries, 1):
        if generate_image(filename, prompt, counter, total):
            success_count += 1
        
        # Rate limiting: wait 30 seconds between requests
        if counter < total:
            print("⏳ Waiting 10 seconds for rate limit...")
            time.sleep(10)  # nosemgrep: arbitrary-sleep  # nosec - Intentional rate limiting for Bedrock image generation API
    
    print()
    print(f"✨ Complete! Generated {success_count}/{total} industry icons")
    print(f"📁 Icons saved to: {OUTPUT_DIR}")
    print(f"💰 Estimated cost: ${success_count * 0.04:.2f}")

if __name__ == "__main__":
    main()
