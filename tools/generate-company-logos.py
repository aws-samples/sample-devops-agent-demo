#!/usr/bin/env python3
"""
Generate company logos using Amazon Bedrock Nova Canvas
Creates professional company logos for 75 AnyCompany CRM customer accounts
"""

import boto3
import json
import base64
import time
import os
from pathlib import Path

# Configuration
OUTPUT_DIR = "lib/stacks/frontend/app/public/crm/logos"
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
    print("🎨 Generating company logos using Amazon Bedrock Nova Canvas")
    print(f"📁 Output directory: {OUTPUT_DIR}")
    print("⏱️  Rate limit: 1 image per 30 seconds")
    print()
    
    # 75 company logos matching mockAccounts.ts
    companies = [
        # Technology (15)
        ("acme-corp.png", "Modern minimalist company logo for Acme Corp, technology company, blue and orange colors, abstract geometric design, clean corporate style, white background"),
        ("techvision-inc.png", "Professional company logo for TechVision Inc, technology company, purple and teal colors, eye symbol with circuit pattern, modern design, white background"),
        ("cloudfirst-solutions.png", "Modern company logo for CloudFirst Solutions, cloud technology, blue gradient colors, cloud icon with upward arrow, clean design, white background"),
        ("datastream-technologies.png", "Professional logo for DataStream Technologies, data analytics company, green and blue colors, flowing data stream pattern, modern style, white background"),
        ("innovatetech-labs.png", "Modern company logo for InnovateTech Labs, innovation company, orange and blue colors, lightbulb with circuit design, clean style, white background"),
        ("cybersecure-systems.png", "Professional logo for CyberSecure Systems, cybersecurity company, dark blue and red colors, shield with lock symbol, corporate design, white background"),
        ("devops-masters.png", "Modern company logo for DevOps Masters, DevOps company, green and blue colors, infinity symbol with gears, clean design, white background"),
        ("ai-dynamics-corp.png", "Professional logo for AI Dynamics Corp, artificial intelligence company, purple and blue gradient, neural network pattern, modern style, white background"),
        ("quantum-computing-inc.png", "Modern company logo for Quantum Computing Inc, quantum tech company, blue and purple colors, atom symbol with orbits, clean design, white background"),
        ("microservices-hub.png", "Professional logo for MicroServices Hub, microservices company, teal and orange colors, connected hexagons pattern, modern style, white background"),
        ("blockchain-ventures.png", "Modern company logo for BlockChain Ventures, blockchain company, gold and blue colors, chain link symbol, clean corporate design, white background"),
        ("edgecompute-networks.png", "Professional logo for EdgeCompute Networks, edge computing company, green and blue colors, network nodes pattern, modern style, white background"),
        ("saas-innovations.png", "Modern company logo for SaaS Innovations, SaaS company, blue and purple gradient, cloud with S letter, clean design, white background"),
        ("platform-engineering-co.png", "Professional logo for Platform Engineering Co, platform company, orange and blue colors, layered platform symbol, modern style, white background"),
        ("neural-networks-ltd.png", "Modern company logo for Neural Networks Ltd, AI company, purple and pink gradient, brain network pattern, clean design, white background"),
        
        # Healthcare (15)
        ("healthcare-systems-inc.png", "Professional logo for HealthCare Systems Inc, healthcare company, green and blue colors, medical cross with heart, corporate style, white background"),
        ("medtech-innovations.png", "Modern company logo for MedTech Innovations, medical technology, teal and green colors, stethoscope with tech pattern, clean design, white background"),
        ("digital-health-partners.png", "Professional logo for Digital Health Partners, digital health company, blue and green colors, heart with pulse line, modern style, white background"),
        ("telemedicine-solutions.png", "Modern company logo for Telemedicine Solutions, telemedicine company, blue and teal colors, video call with medical cross, clean design, white background"),
        ("biopharm-analytics.png", "Professional logo for BioPharm Analytics, pharmaceutical company, purple and blue colors, molecule structure pattern, modern style, white background"),
        ("clinical-data-systems.png", "Modern company logo for Clinical Data Systems, clinical data company, green and blue colors, data chart with medical cross, clean design, white background"),
        ("patient-care-technologies.png", "Professional logo for Patient Care Technologies, patient care company, teal and green colors, caring hands symbol, modern style, white background"),
        ("healthcare-ai-labs.png", "Modern company logo for Healthcare AI Labs, healthcare AI company, purple and green gradient, brain with medical cross, clean design, white background"),
        ("medical-imaging-corp.png", "Professional logo for Medical Imaging Corp, medical imaging company, blue and teal colors, scan image symbol, modern style, white background"),
        ("pharmacy-management-systems.png", "Modern company logo for Pharmacy Management Systems, pharmacy company, green and blue colors, pill bottle with cross, clean design, white background"),
        ("hospital-networks-inc.png", "Professional logo for Hospital Networks Inc, hospital network company, blue and green colors, building with medical cross, modern style, white background"),
        ("wellness-platform-co.png", "Modern company logo for Wellness Platform Co, wellness company, green and teal gradient, leaf with heart symbol, clean design, white background"),
        ("genomics-research-ltd.png", "Professional logo for Genomics Research Ltd, genomics company, purple and blue colors, DNA helix pattern, modern style, white background"),
        ("remote-patient-monitoring.png", "Modern company logo for Remote Patient Monitoring, remote health company, blue and green colors, heart with signal waves, clean design, white background"),
        ("healthcare-compliance-systems.png", "Professional logo for Healthcare Compliance Systems, compliance company, blue and green colors, checkmark with medical cross, modern style, white background"),
        
        # Finance (15)
        ("global-banking-solutions.png", "Professional logo for Global Banking Solutions, banking company, navy blue and gold colors, globe with bank columns, corporate style, white background"),
        ("fintech-innovations.png", "Modern company logo for FinTech Innovations, fintech company, blue and green gradient, coin with circuit pattern, clean design, white background"),
        ("investment-analytics-corp.png", "Professional logo for Investment Analytics Corp, investment company, dark blue and gold colors, upward chart arrow, modern style, white background"),
        ("digital-payments-platform.png", "Modern company logo for Digital Payments Platform, payments company, blue and purple colors, credit card with checkmark, clean design, white background"),
        ("wealth-management-systems.png", "Professional logo for Wealth Management Systems, wealth management company, navy and gold colors, diamond with growth chart, modern style, white background"),
        ("insurance-tech-solutions.png", "Modern company logo for Insurance Tech Solutions, insurtech company, blue and teal colors, umbrella with shield, clean design, white background"),
        ("trading-platform-inc.png", "Professional logo for Trading Platform Inc, trading company, green and blue colors, candlestick chart pattern, modern style, white background"),
        ("risk-management-systems.png", "Modern company logo for Risk Management Systems, risk management company, red and blue colors, shield with graph, clean design, white background"),
        ("blockchain-finance-ltd.png", "Professional logo for Blockchain Finance Ltd, blockchain finance company, gold and blue colors, coin with chain link, modern style, white background"),
        ("credit-analytics-corp.png", "Modern company logo for Credit Analytics Corp, credit analytics company, blue and green colors, credit score gauge, clean design, white background"),
        ("regulatory-compliance-tech.png", "Professional logo for Regulatory Compliance Tech, regtech company, blue and gray colors, checkmark with document, modern style, white background"),
        ("mortgage-solutions-inc.png", "Modern company logo for Mortgage Solutions Inc, mortgage company, blue and orange colors, house with key symbol, clean design, white background"),
        ("financial-data-services.png", "Professional logo for Financial Data Services, financial data company, blue and purple gradient, database with chart, modern style, white background"),
        ("accounting-automation-co.png", "Modern company logo for Accounting Automation Co, accounting company, green and blue colors, calculator with automation symbol, clean design, white background"),
        ("treasury-management-systems.png", "Professional logo for Treasury Management Systems, treasury company, navy and gold colors, vault with coins, modern style, white background"),
        
        # Retail (15)
        ("ecommerce-giants.png", "Modern company logo for E-Commerce Giants, ecommerce company, orange and blue colors, shopping cart with globe, clean design, white background"),
        ("retail-analytics-pro.png", "Professional logo for Retail Analytics Pro, retail analytics company, purple and blue colors, shopping bag with chart, modern style, white background"),
        ("omnichannel-solutions.png", "Modern company logo for Omnichannel Solutions, omnichannel retail company, blue and orange gradient, connected channels symbol, clean design, white background"),
        ("point-of-sale-systems.png", "Professional logo for Point of Sale Systems, POS company, green and blue colors, cash register with checkmark, modern style, white background"),
        ("inventory-management-co.png", "Modern company logo for Inventory Management Co, inventory company, blue and teal colors, boxes with barcode, clean design, white background"),
        ("customer-loyalty-platform.png", "Professional logo for Customer Loyalty Platform, loyalty company, purple and orange colors, star with heart symbol, modern style, white background"),
        ("supply-chain-retail.png", "Modern company logo for Supply Chain Retail, supply chain company, blue and green colors, connected nodes with arrow, clean design, white background"),
        ("fashion-tech-solutions.png", "Professional logo for Fashion Tech Solutions, fashion tech company, pink and purple gradient, hanger with tech pattern, modern style, white background"),
        ("grocery-tech-inc.png", "Modern company logo for Grocery Tech Inc, grocery tech company, green and orange colors, shopping basket with leaf, clean design, white background"),
        ("marketplace-platform-co.png", "Professional logo for Marketplace Platform Co, marketplace company, blue and orange colors, storefront with connections, modern style, white background"),
        ("personalization-engine.png", "Modern company logo for Personalization Engine, personalization company, purple and blue gradient, person icon with gears, clean design, white background"),
        ("retail-automation-systems.png", "Professional logo for Retail Automation Systems, retail automation company, blue and orange colors, robot with shopping cart, modern style, white background"),
        ("mobile-commerce-solutions.png", "Modern company logo for Mobile Commerce Solutions, mobile commerce company, blue and purple colors, smartphone with cart, clean design, white background"),
        ("store-operations-tech.png", "Professional logo for Store Operations Tech, store operations company, green and blue colors, store with gear symbol, modern style, white background"),
        ("visual-merchandising-ai.png", "Modern company logo for Visual Merchandising AI, visual merchandising company, purple and pink gradient, eye with display, clean design, white background"),
        
        # Manufacturing (15)
        ("smart-factory-systems.png", "Professional logo for Smart Factory Systems, smart factory company, blue and orange colors, factory with circuit pattern, modern style, white background"),
        ("industrial-iot-solutions.png", "Modern company logo for Industrial IoT Solutions, industrial IoT company, blue and green colors, connected sensors pattern, clean design, white background"),
        ("quality-control-tech.png", "Professional logo for Quality Control Tech, quality control company, green and blue colors, checkmark with magnifying glass, modern style, white background"),
        ("production-planning-systems.png", "Modern company logo for Production Planning Systems, production planning company, blue and orange colors, calendar with gears, clean design, white background"),
        ("robotics-automation-inc.png", "Professional logo for Robotics Automation Inc, robotics company, blue and gray colors, robot arm symbol, modern style, white background"),
        ("supply-chain-manufacturing.png", "Modern company logo for Supply Chain Manufacturing, supply chain company, green and blue colors, chain with factory, clean design, white background"),
        ("predictive-maintenance-co.png", "Professional logo for Predictive Maintenance Co, predictive maintenance company, blue and orange colors, wrench with chart, modern style, white background"),
        ("manufacturing-analytics.png", "Modern company logo for Manufacturing Analytics, manufacturing analytics company, purple and blue colors, factory with data chart, clean design, white background"),
        ("digital-twin-solutions.png", "Professional logo for Digital Twin Solutions, digital twin company, blue and teal gradient, mirrored objects symbol, modern style, white background"),
        ("warehouse-management-tech.png", "Modern company logo for Warehouse Management Tech, warehouse company, blue and orange colors, warehouse with barcode, clean design, white background"),
        ("energy-management-systems.png", "Professional logo for Energy Management Systems, energy management company, green and blue colors, lightning bolt with leaf, modern style, white background"),
        ("process-optimization-inc.png", "Modern company logo for Process Optimization Inc, process optimization company, blue and green gradient, flowchart with arrow, clean design, white background"),
        ("asset-tracking-solutions.png", "Professional logo for Asset Tracking Solutions, asset tracking company, blue and orange colors, location pin with box, modern style, white background"),
        ("safety-compliance-tech.png", "Modern company logo for Safety Compliance Tech, safety compliance company, orange and blue colors, hard hat with checkmark, clean design, white background"),
        ("additive-manufacturing-co.png", "Professional logo for Additive Manufacturing Co, 3D printing company, purple and blue colors, 3D printer symbol, modern style, white background"),
    ]
    
    total = len(companies)
    success_count = 0
    
    for counter, (filename, prompt) in enumerate(companies, 1):
        if generate_image(filename, prompt, counter, total):
            success_count += 1
        
        # Rate limiting: wait 30 seconds between requests
        if counter < total:
            print("⏳ Waiting 10 seconds for rate limit...")
            time.sleep(10)  # nosemgrep: arbitrary-sleep  # nosec - Intentional rate limiting for Bedrock image generation API
    
    print()
    print(f"✨ Complete! Generated {success_count}/{total} company logos")
    print(f"📁 Logos saved to: {OUTPUT_DIR}")
    print(f"💰 Estimated cost: ${success_count * 0.04:.2f}")

if __name__ == "__main__":
    main()
