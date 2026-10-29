#!/usr/bin/env python3
"""
Generate sales representative avatars using Amazon Bedrock Nova Canvas
Creates professional headshot-style portraits for AnyCompany CRM sales team
"""

import boto3
import json
import base64
import time
import os
from pathlib import Path

# Configuration
OUTPUT_DIR = "lib/stacks/frontend/app/public/avatars"
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
            "height": 512,
            "width": 512,
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
    print("🎨 Generating sales representative avatars using Amazon Bedrock Nova Canvas")
    print(f"📁 Output directory: {OUTPUT_DIR}")
    print("⏱️  Rate limit: 1 image per 30 seconds")
    print()
    
    # 12 sales representatives matching mockTeamData.ts
    sales_reps = [
        ("sarah-chen.jpg", "Professional headshot portrait of Sarah Chen, Asian woman, Account Executive, confident smile, business attire, neutral background, professional photography, high quality"),
        ("marcus-johnson.jpg", "Professional headshot portrait of Marcus Johnson, African American man, Sales Manager, friendly expression, business attire, neutral background, professional photography, high quality"),
        ("jennifer-lee.jpg", "Professional headshot portrait of Jennifer Lee, Asian woman, Account Executive, warm smile, business casual attire, neutral background, professional photography, high quality"),
        ("david-kim.jpg", "Professional headshot portrait of David Kim, Korean man, Sales Representative, professional demeanor, business casual attire, neutral background, professional photography, high quality"),
        ("elena-rodriguez.jpg", "Professional headshot portrait of Elena Rodriguez, Hispanic woman, Account Executive, confident expression, business attire, neutral background, professional photography, high quality"),
        ("james-wilson.jpg", "Professional headshot portrait of James Wilson, Caucasian man, Sales Representative, friendly smile, business casual attire, neutral background, professional photography, high quality"),
        ("aisha-mohammed.jpg", "Professional headshot portrait of Aisha Mohammed, Middle Eastern woman, Account Executive, professional smile, business attire, neutral background, professional photography, high quality"),
        ("michael-brown.jpg", "Professional headshot portrait of Michael Brown, African American man, Sales Representative, confident expression, business casual attire, neutral background, professional photography, high quality"),
        ("sophia-anderson.jpg", "Professional headshot portrait of Sophia Anderson, Caucasian woman, Account Executive, warm smile, business attire, neutral background, professional photography, high quality"),
        ("carlos-martinez.jpg", "Professional headshot portrait of Carlos Martinez, Hispanic man, Sales Representative, friendly expression, business casual attire, neutral background, professional photography, high quality"),
        ("lisa-wang.jpg", "Professional headshot portrait of Lisa Wang, Asian woman, Account Executive, confident smile, business attire, neutral background, professional photography, high quality"),
        ("ahmed-hassan.jpg", "Professional headshot portrait of Ahmed Hassan, Middle Eastern man, Sales Representative, warm smile, business casual attire, neutral background, professional photography, high quality"),
    ]
    
    total = len(sales_reps)
    success_count = 0
    
    for counter, (filename, prompt) in enumerate(sales_reps, 1):
        if generate_image(filename, prompt, counter, total):
            success_count += 1
        
        # Rate limiting: wait 30 seconds between requests
        if counter < total:
            print("⏳ Waiting 10 seconds for rate limit...")
            time.sleep(10)  # nosemgrep: arbitrary-sleep  # nosec - Rate limiting for Bedrock image generation API
    
    print()
    print(f"✨ Complete! Generated {success_count}/{total} sales representative avatars")
    print(f"📁 Avatars saved to: {OUTPUT_DIR}")
    print(f"💰 Estimated cost: ${success_count * 0.04:.2f}")

if __name__ == "__main__":
    main()
