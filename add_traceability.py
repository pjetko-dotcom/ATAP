import json

with open('src/data/asvsData.ts', 'r') as f:
    content = f.read()

# This is a bit tricky since it's a TS file, but we can parse the JSON part or just inject some.
