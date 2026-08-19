document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error('Data file not found.');
            return response.json();
        })
        .then(data => {
            document.getElementById('league-name').innerText = data.league.name;
            
            if (data.last_updated) {
                const updateDate = new Date(data.last_updated);
                const timeString = updateDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                document.getElementById('last-updated-text').innerText = `Updated: ${timeString}`;
            }

            let standings = data.standings.results;
            
            // FPL Pre-Season Quirk Fix
            if (standings.length === 0 && data.new_entries) {
                standings = data.new_entries.results.map((manager, index) => ({
                    rank: '-', last_rank: '-', entry_name: manager.entry_name,
                    player_name: `${manager.player_first_name} ${manager.player_last_name}`,
                    event_total: 0, total: 0, gw_history: []
                }));
            }

            // Render Widgets
            if (data.top_prem_players) renderTopPlayers(data.top_prem_players);
            renderPodium(standings.slice(0, 3));
            renderTable(standings);
            renderChart(standings);
        })
        .catch(error => console.error('Error:', error));
});

function renderTopPlayers(players) {
    const container = document.getElementById('top-players-container');
    container.style.display = 'grid';
    let html = '';
    
    players.forEach(p => {
        html += `
            
                
                    ${p.position}
                    ${p.name}
                    ${p.team}
                
                ${p.points}
            
        `;
    });
    container.innerHTML = html;
}

function renderTable(standings) {
    const tbody = document.getElementById('league-table-body');
    let tableHTML = '';
    
    // Find the highest GW score for the 🔥 badge
    const highestGW = Math.max(...standings.map(m => m.event_total));
    const firstPlacePoints = standings[0] ? standings[0].total : 0;

    standings.forEach((manager, index) => {
        // Form: Average of last 3 GWs
        let form = 0;
        if (manager.gw_history && manager.gw_history.length > 0) {
            const last3 = manager.gw_history.slice(-3);
            const sum = last3.reduce((a, b) => a + b, 0);
            form = (sum / last3.length).toFixed(1);
        }

        // Differentials
        const diffToNext = index === 0 ? '-' : standings[index-1].total - manager.total;
        const diffToFirst = index === 0 ? '-' : firstPlacePoints - manager.total;
        
        // Arrow Logic
        let arrow = '—';
        if (manager.rank < manager.last_rank) arrow = '▲';
        else if (manager.rank > manager.last_rank) arrow = '▼';

        // Manager of the Week Badge
        let motwBadge = (manager.event_total === highestGW && highestGW > 0) ? '🔥 MOTW' : '';

        tableHTML += `
            
                ${manager.rank}${arrow}
                
                    
                        ${manager.entry_name} ${motwBadge}
                        ${manager.player_name}
                    
                
                ${form}
                ${manager.event_total}
                ${manager.total}
                -${diffToNext}
                -${diffToFirst}
            
        `;
    });
    tbody.innerHTML = tableHTML;
}

function renderPodium(topManagers) { /* Leave this exactly as it was before */
    const podiumContainer = document.getElementById('podium-container');
    if (topManagers.length === 0) return;
    podiumContainer.style.display = 'grid';
    let podiumHTML = '';
    topManagers.forEach(manager => {
        podiumHTML += `
            
                ${manager.rank}
                
                    ${manager.entry_name}
                    ${manager.player_name}
                    
                        GW Pts${manager.event_total}
                        Total${manager.total}
                    
                
            `;
    });
    podiumContainer.innerHTML = podiumHTML;
}

function renderChart(standings) { /* Leave this exactly as it was before */
    const canvas = document.getElementById('pointsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!standings[0].gw_history || standings[0].gw_history.length === 0) return;
    const labels = standings[0].gw_history.map((_, i) => `GW ${i + 1}`);
    const colors = ['#00ff87', '#02efff', '#ff2882', '#37003c', '#eab308', '#a855f7', '#3b82f6', '#f97316'];
    const datasets = standings.map((manager, i) => ({
        label: manager.entry_name, data: manager.gw_history,
        borderColor: colors[i % colors.length], backgroundColor: colors[i % colors.length],
        tension: 0.3, borderWidth: 2, pointRadius: 3, fill: false
    }));
    new Chart(ctx, {
        type: 'line', data: { labels, datasets },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
    });
}
