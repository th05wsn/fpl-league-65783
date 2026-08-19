import requests
import json
import os

# Get the League ID from GitHub Secrets
LEAGUE_ID = os.environ.get("LEAGUE_ID")

if not LEAGUE_ID:
    print("Error: LEAGUE_ID secret is missing!")
    exit(1)

print(f"Fetching data for League ID: {LEAGUE_ID}")

# FPL API endpoint for classic league standings
url = f"https://fantasy.premierleague.com/api/leagues-classic/{LEAGUE_ID}/standings/"

# Adding a User-Agent to prevent FPL from blocking the automated request
headers = {'User-Agent': 'Mozilla/5.0'}
response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    # Save the data to a local file for the frontend to read
    with open("data.json", "w") as f:
        json.dump(data, f)
    print("Success! data.json has been updated.")
else:
    print(f"Failed to fetch data. Status code: {response.status_code}")
    exit(1)
