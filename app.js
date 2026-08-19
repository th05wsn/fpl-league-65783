document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error('Data file not found.');
            return response.json();
        })
        .then(data => {
            // Update League Title
            document.getElementById('league-name').innerText = data.league.name;
            
            let standings = data.standings.results;
            
            // FPL API QUIRK FIX: If standings are empty (before GW1 updates), use new_entries instead
            if (standings.length === 0 && data.new_entries && data.new_entries.results.length > 0) {
                console.log("Standings empty! Pulling from new_entries instead.");
                standings = data.new_entries.results.map((manager, index) => ({
                    rank: '-',
                    last_rank: '-',
                    entry_name: manager.entry_name,
                    player_name: `${manager.player_first_name} ${manager.player_last_name}`,
                    event_total: 0,
                    total: 0,
                    gw_history: [] // Fills the chart with blank data until GW1 points drop
                }));
            }
            
            // Render the UI
            renderPodium(standings.slice(0, 3));
            renderTable(standings);
            
            // If you added the chart from earlier, uncomment the line below!
            // renderChart(standings);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            document.getElementById('league-name').innerText = "Awaiting First Data Sync";
        });
});
function renderPodium(topManagers) {
    const podiumContainer = document.getElementById('podium-container');
    
    // Only show podium if we actually have data
    if (topManagers.length === 0) return;
    podiumContainer.style.display = 'grid';

    let podiumHTML = '';

    topManagers.forEach(manager => {
        // Create the card structure for the top 3
        podiumHTML += `
            <div class="manager-card rank-${manager.rank}">
                <div class="card-rank">${manager.rank}</div>
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
    let tableHTML = '';

    standings.forEach(manager => {
        // Determine Rank Movement Arrow
        let arrow = '<span class="arrow-flat">—</span>';
        if (manager.rank < manager.last_rank) {
            arrow = '<span class="arrow-up">▲</span>';
        } else if (manager.rank > manager.last_rank) {
            arrow = '<span class="arrow-down">▼</span>';
        }

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
                        <span class="team-name">${manager.entry_name}</span>
                        <span class="manager-name">${manager.player_name}</span>
                    </div>
                </td>
                <td class="center-col">
                    <span class="pts-gw">${manager.event_total}</span>
                </td>
                <td class="center-col">
                    <span class="pts-total">${manager.total}</span>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = tableHTML;
}
