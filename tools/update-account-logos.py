#!/usr/bin/env python3
"""
Update mockAccounts.ts to add logoUrl field to all accounts.
This script adds the logoUrl field based on the account name.
"""

import re

def name_to_filename(name):
    """Convert account name to logo filename"""
    # Convert to lowercase and replace spaces/special chars with hyphens
    filename = name.lower()
    filename = re.sub(r'[^a-z0-9]+', '-', filename)
    filename = filename.strip('-')
    return f"/crm/logos/{filename}.png"

def update_accounts_file():
    """Update the mockAccounts.ts file with logoUrl fields"""
    file_path = 'lib/stacks/frontend/app/src/pages/CRM/data/mockAccounts.ts'
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Pattern to match account objects
    # Match from opening brace to closing brace, capturing the name field
    pattern = r"(\{\s*id:\s*'[^']+',\s*name:\s*'([^']+)',.*?createdDate:\s*new Date\('[^']+'\),)\s*\},"
    
    def add_logo_url(match):
        account_block = match.group(1)
        account_name = match.group(2)
        logo_url = name_to_filename(account_name)
        return f"{account_block}\n    logoUrl: '{logo_url}',\n  }},"
    
    # Replace all account objects
    updated_content = re.sub(pattern, add_logo_url, content, flags=re.DOTALL)
    
    # Write back
    with open(file_path, 'w') as f:
        f.write(updated_content)
    
    print(f"✅ Updated {file_path}")
    print("Added logoUrl field to all 75 accounts")

if __name__ == '__main__':
    update_accounts_file()
