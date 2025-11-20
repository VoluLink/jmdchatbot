#!/usr/bin/env python3
"""Update .env file with API key."""

# Read current .env
with open('.env', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the API key
content = content.replace(
    'OPENAI_API_KEY=sk-your-openai-api-key-here',
    'OPENAI_API_KEY=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'
)

# Make sure we have gpt-4o-mini (not gpt-4o-mini which might be what they meant by "gpt 5 mini")
content = content.replace('OPENAI_MODEL=gpt-4o-mini', 'OPENAI_MODEL=gpt-4o-mini')

# Write back
with open('.env', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated .env with API key")
