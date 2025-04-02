// Vérifie si le JWT existe
const token = localStorage.getItem('jwtToken');

if (!token) {
    window.location.href = 'login.html'; 
}

// Gère la déconnexion
document.getElementById("logout")?.addEventListener("click", function() {
    localStorage.removeItem('jwtToken'); 
    window.location.href = 'index.html'; 
});

function showSection(id) {
    const section = document.getElementById(id);
    if (section) {
        if (section.style.display === 'block') {
            section.style.display = 'none';
        } else {
            document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
            section.style.display = 'block';
        }
    }
}

// Fonction pour récupérer un aperçu des logs
async function fetchPreviewLogs() {
    try {
        const token = localStorage.getItem('jwtToken');
        const response = await fetch("https://arduinoooo.lol/logs", {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Erreur lors de la récupération des logs.");

        const logs = await response.json();
        const latestLogs = logs.slice(0, 5); 

        const container = document.getElementById("preview-log-list");
        if (!container) return;

        container.innerHTML = '';

        latestLogs.forEach(log => {
            const p = document.createElement("p");
            p.classList.add(`log-${log.action}`);
            p.textContent = `[${formatDate(log.date_heure)}] ${log.details || '–'} - ${log.name || '–'}`;
            container.appendChild(p);
        });

    } catch (error) {
        console.error(error);
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'medium'
    });
}

// Récupérer les logs au chargement de la page
document.addEventListener("DOMContentLoaded", fetchPreviewLogs);
