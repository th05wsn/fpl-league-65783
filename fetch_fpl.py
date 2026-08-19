import requests
import json
import os
import time
import datetime

LEAGUE_ID = os.environ.get("LEAGUE_ID")

if not LEAGUE_ID:
    print("Error: LEAGUE_ID secret is missing!")
    exit(1)

headers = {'User-Agent': 'Mozilla/5.0'}

# 1. Fetch League Standings
url = f"https://fantasy.premierleague.com/api/leagues-classic/{LEAGUE_ID}/standings/"
response = requests.get(url, headers=headers)
data = response.json() if response.status_code == 200 else exit(1)

# 2. Fetch Gameweek Histories
managers = data['standings']['results']
for manager in managers:
    hist_url = f"https://fantasy.premierleague.com/api/entry/{manager['entry']}/history/"
    hist_resp = requests.get(hist_url, headers=headers)
    if hist_resp.status_code == 200:
        manager['gw_history'] = [gw['total_points'] for gw in hist_resp.json()['current']]
    else:
        manager['gw_history'] = []
    time.sleep(0.5)

# 3. NEW: Fetch Global FPL Players (Bootstrap)
bootstrap_url = "https://fantasy.premierleague.com/api/bootstrap-static/"
boot_resp = requests.get(bootstrap_url, headers=headers)
if boot_resp.status_code == 200:
    boot_data = boot_resp.json()
    players = boot_data['elements']
    teams = {t['id']: t['short_name'] for t in boot_data['teams']}
    positions = {p['id']: p['singular_name_short'] for p in boot_data['element_types']}

    # Find highest scoring player for each position (1=GK, 2=DEF, 3=MID, 4=FWD)
    top_players = {1: None, 2: None, 3: None, 4: None}
    for p in players:
        pos = p['element_type']
        if top_players[pos] is None or p['total_points'] > top_players[pos]['total_points']:
            top_players[pos] = p

    formatted_top_players = []
    for pos_id, p in top_players.items():
        if p:
            formatted_top_players.append({
                'name': p['web_name'],
                'position': positions[pos_id],
                'team': teams[p['team']],
                'points': p['total_points']
            })
    data['top_prem_players'] = formatted_top_players

# 4. Save the Enriched Data
data['last_updated'] = datetime.datetime.utcnow().isoformat()
with open("data.json", "w") as f:
    json.dump(data, f)
print("Success! data.json updated with history and global stats.")
