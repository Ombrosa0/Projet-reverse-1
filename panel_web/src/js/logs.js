let currentPage = 1;
const logsPerPage = 10;
let allLogs = [];

document.addEventListener("DOMContentLoaded", function () {
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.removeItem('jwtToken');
            window.location.href = './login.html'; 
        });
    }
});

async function fetchLogs() {
    try {
        const token = localStorage.getItem('jwtToken');
        const response = await fetch("https://arduinoooo.lol/logs", {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Erreur lors de la récupération des logs.");
        }

        allLogs = await response.json();
        renderLogs();
        renderPagination();
    } catch (error) {
        console.error(error);
    }
}

function renderLogs() {
    const tbody = document.querySelector("#logsTable tbody");
    tbody.innerHTML = '';

    const start = (currentPage - 1) * logsPerPage;
    const end = start + logsPerPage;
    const logsToDisplay = allLogs.slice(start, end);

    logsToDisplay.forEach(log => {
    const row = document.createElement('tr');
    row.classList.add(`log-${log.action}`);
    row.innerHTML = `
        <td>${formatDate(log.date_heure)}</td>
        <td>${log.badge_id || '–'}</td>
        <td>${log.name || '–'}</td>
        <td>${log.details || '–'}</td>
    `;
    tbody.appendChild(row);
});

}

function renderPagination() {
    let pagination = document.querySelector('.pagination');
    if (!pagination) {
        pagination = document.createElement('div');
        pagination.className = 'pagination';
        pagination.innerHTML = `
            <button id="prevPage">Précédent</button>
            <span id="pageInfo"></span>
            <button id="nextPage">Suivant</button>
        `;
        document.body.appendChild(pagination);
    }

    const totalPages = Math.ceil(allLogs.length / logsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} / ${totalPages}`;

    document.getElementById('prevPage').onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderLogs();
            renderPagination();
        }
    };

    document.getElementById('nextPage').onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderLogs();
            renderPagination();
        }
    };
}

// Formateur de date ISO → format FR lisible
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'medium'
    });
}

document.addEventListener("DOMContentLoaded", fetchLogs);
