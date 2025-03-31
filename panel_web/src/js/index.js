// Vérifie si le JWT existe
const token = localStorage.getItem('jwtToken');

if (!token) {
    window.location.href = 'login.html'; 
}

// Gère la déconnexion
document.getElementById("logout").addEventListener("click", function() {
    localStorage.removeItem('jwtToken'); 
    window.location.href = 'index.html'; 
});

function showSection(id) {
    const section = document.getElementById(id);

    if (section.style.display === 'block') {
        section.style.display = 'none';
    } else {
    
        document.querySelectorAll('.section').forEach(sec => {
            sec.style.display = 'none';
        });
        section.style.display = 'block';
    }
}

// Fonction pour récupérer le dernier badge_id
async function fetchLastBadge() {
    const token = localStorage.getItem('jwtToken'); 

    try {
        const response = await fetch("https://arduinoooo.lol/last_badge", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        const result = await response.json();

        console.log(result); 

        if (response.ok) {
            
            const badgeId = result.badge_id;
            if (badgeId) {
                console.log(`Badge ID récupéré: ${badgeId}`);
                
                document.getElementById("badge_id").value = badgeId;
            } else {
                console.log("Aucun badge trouvé.");
                document.getElementById("badge_id").value = 'Aucun badge trouvé';
            }
        } else {
            console.error("Erreur : Impossible de récupérer le dernier badge.");
            document.getElementById("badge_id").value = 'Erreur de récupération';
        }
    } catch (error) {
        console.error("Erreur lors de la récupération du dernier badge :", error);
        document.getElementById("badge_id").value = 'Erreur de connexion';
    }
}

// Fonction appelée lorsque la page est complètement chargée
document.addEventListener("DOMContentLoaded", function () {
    fetchLastBadge(); 
});

// Ajout de l'événement pour le bouton "Rafraîchir" l'UID
document.getElementById("refreshBadgeBtn").addEventListener("click", function () {
    fetchLastBadge(); 
});

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

document.addEventListener("DOMContentLoaded", fetchPreviewLogs);
