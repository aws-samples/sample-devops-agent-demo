#!/usr/bin/env python3
"""
Generate AnyCompany CRM app logo using Amazon Bedrock Nova Canvas
Creates professional app logo in multiple sizes
"""

import boto3
import json
import base64
import time
import os
from pathlib import Path

# Configuration
OUTPUT_DIR = "lib/stacks/frontend/app/public/crm/branding"
REGION = "us-east-1"
MODEL_ID = "amazon.nova-canvas-v1:0"

# Create output directory
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

# Initialize Bedrock client
bedrock = boto3.client('bedrock-runtime', region_name=REGION)

def generate_image(filename, prompt, size, counter, total):
    """Generate a single image using Bedrock Nova Canvas"""
    output_path = os.path.join(OUTPUT_DIR, filename)
    
    print(f"[{counter}/{total}] Generating: {filename} ({size}x{size})")
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
            "height": size,
            "width": size,
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
    print("🎨 Generating AnyCompany CRM app logo using Amazon Bedrock Nova Canvas")
    print(f"📁 Output directory: {OUTPUT_DIR}")
    print("⏱️  Rate limit: 1 image per 30 seconds")
    print()
    
    # Base prompt for the logo
    base_prompt = "Modern professional logo for AnyCompany CRM, abstract letter A and C combined in a creative way, blue and orange gradient colors, clean corporate design, minimalist style, white background, suitable for app icon"
    
    # 4 sizes for different use cases (minimum 320x320 for Bedrock)
    # We'll generate at higher resolution and resize later if needed
    logo_sizes = [
        ("logo-320.png", base_prompt, 320),
        ("logo-512.png", base_prompt, 512),
        ("logo-1024.png", base_prompt, 1024),
        ("logo-1280.png", base_prompt, 1280),
    ]
    
    total = len(logo_sizes)
    success_count = 0
    
    for counter, (filename, prompt, size) in enumerate(logo_sizes, 1):
        if generate_image(filename, prompt, size, counter, total):
            success_count += 1
        
        # Rate limiting: wait 30 seconds between requests
        if counter < total:
            print("⏳ Waiting 10 seconds for rate limit...")
            time.sleep(10)  # nosemgrep: arbitrary-sleep  # nosec - Rate limiting for Bedrock image generation API
    
    print()
    print(f"✨ Complete! Generated {success_count}/{total} app logo sizes")
    print(f"📁 Logos saved to: {OUTPUT_DIR}")
    print(f"💰 Estimated cost: ${success_count * 0.04:.2f}")
    print()
    print("Next steps:")
    print("1. Resize logo-320.png to 32x32 and copy to public/favicon.png for browser favicon")
    print("2. Update navigation header to use logo-512.png (will auto-scale)")
    print("3. Use logo-1024.png for login page and loading screens")
    print("4. Use logo-1280.png for high-DPI displays")

if __name__ == "__main__":
    main()
