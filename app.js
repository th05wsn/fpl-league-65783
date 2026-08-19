document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error('Data file not found.');
            return response.json();
        })
        .then(data => {
            // League Name
            if (data.league && data.league.name) {
                document.getElementById('league-name').innerText = data.league.name;
            }

            // Last Updated Timestamp
            if (data.last_updated) {
                const updateDate = new Date(data.last_updated);
                const timeString = updateDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                document.getElementById('last-updated-text').innerText = `Updated: ${timeString}`;
            }

            // Pre-Season Handling
            const rawStandings = data.standings ? data.standings.results : [];
            let standings = [];

            if (rawStandings.length === 0 && data.new_entries && data.new_entries.results) {
                // Pre-Season: Assign clean positions so podium & table cards style correctly
                standings = data.new_entries.results.map((manager, index) => ({
                    rank: index + 1,
                    last_rank: index + 1,
                    entry_name: manager.entry_name,
                    player_name: `${manager.player_first_name} ${manager.player_last_name}`,
                    event_total: 0,
                    total: 0,
                    gw_history: []
                }));
            } else {
                standings = rawStandings;
            }

            // Render Widgets
            if (data.top_prem_players && data.top_prem_players.length > 0) {
                renderTopPlayers(data.top_prem_players);
            }
            
            renderPodium(standings.slice(0, 3));
            renderTable(standings);
            renderChart(standings);
        })
        .catch(error => {
            console.error('Error loading dashboard data:', error);
            document.getElementById('league-name').innerText = "Awaiting Data Sync";
        });
});

function renderTopPlayers(players) {
    const container = document.getElementById('top-players-container');
    if (!container) return;
    container.style.display = 'grid';
    let html = '';
    
    players.forEach(p => {
        html += `
            <div class="player-card">
                <div class="player-info">
                    <span class="player-pos">${p.position}</span>
                    <span class="player-name">${p.name}</span>
                    <span class="player-team">${p.team}</span>
                </div>
                <div class="player-pts">${p.points}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderPodium(topManagers) {
    const podiumContainer = document.getElementById('podium-container');
    if (!podiumContainer || topManagers.length === 0) return;
    podiumContainer.style.display = 'grid';

    let podiumHTML = '';
    topManagers.forEach((manager, idx) => {
        const displayRank = manager.rank || (idx + 1);
        podiumHTML += `
            <div class="manager-card rank-${displayRank}">
                <div class="card-rank">${displayRank}</div>
                <div class="card-content">
                    <div class="card-team-name">${manager.entry_name}</div>
                    <div class="card-manager">${manager.player_name}</div>
                    <div class="card-stats">
                        <div class="stat-group">
                            <span class="stat-label">GW Pts</span>
                            <span class="stat-value">${manager.event_total}</span>
                        </div>
                        <div class="stat-group">
                            <span class="stat-label">Total</span>
                            <span class="stat-value" style="color: var(--fpl-purple);">${manager.total}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    podiumContainer.innerHTML = podiumHTML;
}

function renderTable(standings) {
    const tbody = document.getElementById('league-table-body');
    if (!tbody) return;
    let tableHTML = '';
    
    const highestGW = Math.max(...standings.map(m => m.event_total || 0));
    const firstPlacePts = standings[0] ? standings[0].total : 0;

    standings.forEach((manager, index) => {
        // Form calculation
        let form = '-';
        if (manager.gw_history && manager.gw_history.length > 0) {
            const last3 = manager.gw_history.slice(-3);
            const sum = last3.reduce((a, b) => a + b, 0);
            form = (sum / last3.length).toFixed(1);
        }

        // Differentials
        const prevPts = index > 0 ? standings[index - 1].total : manager.total;
        const gapVal = index === 0 ? 0 : (prevPts - manager.total);
        const toFirstVal = index === 0 ? 0 : (firstPlacePts - manager.total);

        const gapStr = gapVal === 0 ? '-' : `-${gapVal}`;
        const toFirstStr = toFirstVal === 0 ? '-' : `-${toFirstVal}`;

        // Rank movement
        let arrow = '<span class="arrow-flat">—</span>';
        if (manager.rank < manager.last_rank) arrow = '<span class="arrow-up">▲</span>';
        else if (manager.rank > manager.last_rank) arrow = '<span class="arrow-down">▼</span>';

        // Manager of the Week Badge
        const motwBadge = (manager.event_total === highestGW && highestGW > 0) 
            ? '<span class="motw-badge">🔥 MOTW</span>' 
            : '';

        tableHTML += `
            <tr>
                <td>
                    <div class="rank-movement">
                        <span>${manager.rank}</span>
                        ${arrow}
                    </div>
                </td>
                <td>
                    <div class="team-info">
                        <span class="team-name">${manager.entry_name} ${motwBadge}</span>
                        <span class="manager-name">${manager.player_name}</span>
                    </div>
                </td>
                <td class="center-col"><span class="pts-gw" style="color:var(--text-main); font-weight:700;">${form}</span></td>
                <td class="center-col"><span class="pts-gw">${manager.event_total}</span></td>
                <td class="center-col"><span class="pts-total">${manager.total}</span></td>
                <td class="center-col"><span class="diff-badge">${gapStr}</span></td>
                <td class="center-col"><span class="diff-badge diff-1st">${toFirstStr}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = tableHTML;
}

function renderChart(standings) {
    const container = document.getElementById('chart-container');
    if (!container) return;

    const hasHistory = standings.length > 0 && 
                       standings[0].gw_history && 
                       standings[0].gw_history.length > 0;

    if (!hasHistory) {
        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:100%; color:#6b7280; font-weight:600; text-align:center; padding: 2rem;">
                📈 The Points Race graph will populate automatically after Gameweek 1 points are updated!
            </div>
        `;
        return;
    }

    const canvas = document.getElementById('pointsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const labels = standings[0].gw_history.map((_, i) => `GW ${i + 1}`);
    const colors = ['#00ff87', '#02efff', '#ff2882', '#37003c', '#eab308', '#a855f7', '#3b82f6', '#f97316'];
    
    const datasets = standings.map((manager, i) => ({
        label: manager.entry_name,
        data: manager.gw_history,
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length],
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
        fill: false
    }));

    new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } }
        }
    });
}
