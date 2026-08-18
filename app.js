const LEAGUE_ID = '65783';
const TARGET_URL = `https://fantasy.premierleague.com/api/leagues-classic/${LEAGUE_ID}/standings/`;
const PROXIES = [
    // Proxy 1: CodeTabs (often works well for FPL)
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(TARGET_URL)}`,
    // Proxy 2: ThingProx
    `https://thingproxy.freeboard.io/fetch/${TARGET_URL}`,
    // Proxy 3: CORS Proxy IO (Original fallback)
    `https://corsproxy.io/?url=${encodeURIComponent(TARGET_URL)}`
];

let globalData = [];
let currentSort = { column: 'rank', asc: true };

async function fetchLeagueData() {
    // UI Loading state
    document.getElementById('error-state').classList.add('hidden');
    const icon = document.getElementById('refresh-icon');
    icon.classList.add('fa-spin');
    document.getElementById('last-updated').innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Syncing...`;

    let data = null;
    for (let proxy of PROXIES) {
        try {
            const response = await fetch(proxy, { cache: "no-cache" });
            if (response.ok) {
                data = await response.json();
                break; 
            }
        } catch (error) {
            console.warn(`Proxy failed, trying fallback...`);
        }
    }

    icon.classList.remove('fa-spin');
    
    if (!data) {
        document.getElementById('error-state').classList.remove('hidden');
        document.getElementById('last-updated').textContent = "Update failed";
        return;
    }

    // Update timestamp
    const now = new Date();
    document.getElementById('last-updated').innerHTML = `<i class="fa-regular fa-clock mr-1"></i> ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

    processData(data);
}

function processData(data) {
    document.getElementById('league-title').textContent = data.league.name;
    globalData = data.standings.results;
    
    // Analytics
    updateStats(globalData);
    
    // Render table (default sort)
    sortTable('rank', true); 
}

function updateStats(standings) {
    document.getElementById('player-count').textContent = standings.length;
    
    if (standings.length === 0) return;

    let highestGwScore = 0;
    let highestGwPlayer = '';
    let totalPointsPool = 0;

    standings.forEach(manager => {
        if (manager.event_total > highestGwScore) {
            highestGwScore = manager.event_total;
            highestGwPlayer = manager.player_name;
        }
        totalPointsPool += manager.total;
    });

    // Update Cards
    document.getElementById('leader-skeleton').classList.add('hidden');
    document.getElementById('leader-content').classList.remove('hidden');
    
    const topManager = standings.reduce((prev, current) => (prev.rank < current.rank) ? prev : current);
    document.getElementById('top-manager-name').textContent = topManager.player_name;
    document.getElementById('top-team-name').textContent = topManager.entry_name;
    
    document.getElementById('highest-gw-score').innerHTML = `${highestGwScore} <span class="text-xs text-gray-500 font-normal ml-1 border-l border-gray-200 pl-2">${highestGwPlayer.split(' ')[0]}</span>`;
    document.getElementById('league-avg-score').textContent = (totalPointsPool / standings.length).toFixed(1);

    const projection = Math.round(topManager.total * 1.35); 
    document.getElementById('projected-winner-score').textContent = projection > 0 ? projection : 2450;
}

function renderTable(dataArray) {
    const tbody = document.getElementById('standings-body');
    const noResults = document.getElementById('no-results');
    tbody.innerHTML = '';

    if (dataArray.length === 0) {
        noResults.classList.remove('hidden');
        return;
    } else {
        noResults.classList.add('hidden');
    }

    dataArray.forEach((manager, index) => {
        // Rank Movement Visuals
        let movementHtml = '<span class="text-gray-300 font-bold text-xs"><i class="fa-solid fa-minus"></i></span>';
        if (manager.last_rank > manager.rank) {
            const diff = manager.last_rank - manager.rank;
            movementHtml = `<span class="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-bold flex items-center justify-center w-8"><i class="fa-solid fa-caret-up mr-1"></i>${diff}</span>`;
        } else if (manager.last_rank < manager.rank && manager.last_rank !== 0) {
            const diff = manager.rank - manager.last_rank;
            movementHtml = `<span class="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-bold flex items-center justify-center w-8"><i class="fa-solid fa-caret-down mr-1"></i>${diff}</span>`;
        }

        // Animation delay for nice load effect
        const animDelay = index < 15 ? `style="animation-delay: ${index * 0.03}s"` : '';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors border-b border-gray-50 animate-row';
        if (animDelay) tr.setAttribute('style', `animation-delay: ${index * 0.03}s`);
        
        tr.innerHTML = `
            <td class="px-5 py-4 whitespace-nowrap w-24">
                <div class="flex flex-col items-center space-y-1">
                    <span class="text-lg font-black ${manager.rank === 1 ? 'text-yellow-500' : 'text-gray-700'}">${manager.rank}</span>
                    ${movementHtml}
                </div>
            </td>
            <td class="px-5 py-4">
                <a href="https://fantasy.premierleague.com/entry/${manager.entry}/history" target="_blank" class="block group">
                    <div class="font-bold text-gray-900 group-hover:text-fpl-purple transition-colors text-base">${manager.entry_name}</div>
                    <div class="text-sm text-gray-500 group-hover:text-gray-700 flex items-center mt-0.5">
                        <i class="fa-regular fa-user text-xs mr-1.5 opacity-50"></i> ${manager.player_name}
                    </div>
                </a>
            </td>
            <td class="px-5 py-4 text-center whitespace-nowrap">
                <span class="inline-flex items-center justify-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold border border-blue-100">${manager.event_total}</span>
            </td>
            <td class="px-5 py-4 text-center whitespace-nowrap">
                <span class="font-black text-fpl-purple text-lg">${manager.total.toLocaleString()}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Sorting Logic
function sortTable(column, forceAsc = null) {
    if (forceAsc !== null) {
        currentSort.asc = forceAsc;
        currentSort.column = column;
    } else if (currentSort.column === column) {
        currentSort.asc = !currentSort.asc; // Toggle
    } else {
        currentSort.column = column;
        currentSort.asc = column === 'rank'; // Default asc for rank, desc for points
    }

    const sorted = [...globalData].sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        
        if (valA < valB) return currentSort.asc ? -1 : 1;
        if (valA > valB) return currentSort.asc ? 1 : -1;
        return 0;
    });

    filterAndRender(sorted);
}

// Search Logic
document.getElementById('searchInput').addEventListener('input', (e) => {
    filterAndRender(globalData); 
});

function filterAndRender(dataArray) {
    const term = document.getElementById('searchInput').value.toLowerCase();
    if (!term) {
        renderTable(dataArray);
        return;
    }
    const filtered = dataArray.filter(m => 
        m.player_name.toLowerCase().includes(term) || 
        m.entry_name.toLowerCase().includes(term)
    );
    renderTable(filtered);
}

// Initialize on load
window.addEventListener('DOMContentLoaded', fetchLeagueData);
