// Vérifie si le JWT existe
const token = localStorage.getItem('jwtToken');

if (!token) {
    window.location.href = 'login.html'; // Redirige vers login si le token n'est pas présent
}

// Gère la déconnexion
document.getElementById("logout").addEventListener("click", function() {
    localStorage.removeItem('jwtToken'); // Supprime le JWT du localStorage
    window.location.href = 'index.html'; // Redirige vers la page de login
});

function showSection(id) {
    const section = document.getElementById(id);

    // Si la section est déjà visible, on la cache
    if (section.style.display === 'block') {
        section.style.display = 'none';
    } else {
        // Sinon, on cache toutes les autres sections et on affiche celle-ci
        document.querySelectorAll('.section').forEach(sec => {
            sec.style.display = 'none';
        });
        section.style.display = 'block';
    }
}

// Fonction pour récupérer le dernier badge
async function fetchLastBadge() {
    const token = localStorage.getItem('jwtToken'); // Récupère le JWT du localStorage

    try {
        const response = await fetch("https://arduinoooo.lol/last_badge", {
            method: "GET", // Méthode GET pour récupérer le dernier badge
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // Ajout du JWT dans les en-têtes
            }
        });

        const result = await response.json();

        console.log(result); // Affiche la réponse de l'API dans la console pour l'inspecter

        if (response.ok) {
            // Vérifie si le champ _id existe dans la réponse
            const badgeId = result._id;
            if (badgeId) {
                console.log(`Badge _id récupéré: ${badgeId}`); // Affiche l'ID dans la console
                // Mets à jour l'input du formulaire avec l'_id récupéré
                document.getElementById("badge_uid").value = badgeId;
            } else {
                console.error("Aucun badge trouvé.");
            }
        } else {
            alert("Erreur : Impossible de récupérer le dernier badge.");
        }
    } catch (error) {
        console.error("Erreur lors de la récupération du dernier badge :", error);
        alert("Une erreur s'est produite.");
    }
}

// Fonction appelée lorsque la page est complètement chargée
document.addEventListener("DOMContentLoaded", function () {
    fetchLastBadge(); // Charge l'UID du dernier badge
});

// Ajout de l'événement pour le bouton "Rafraîchir" l'UID
document.getElementById("refreshBadgeBtn").addEventListener("click", function () {
    fetchLastBadge(); // Rafraîchit l'UID lorsqu'on clique sur le bouton
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
        const latestLogs = logs.slice(0, 5); // les 5 plus récents

        const container = document.getElementById("preview-log-list");
        container.innerHTML = '';

        latestLogs.forEach(log => {
            const p = document.createElement("p");
            p.classList.add(`log-${log.action}`);
            p.textContent = `[${formatDate(log.date_heure)}] ${log.action} - ${log.name || '–'} - ${log.details || '–'}`;
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
