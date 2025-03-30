document.addEventListener("DOMContentLoaded", function () {
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.removeItem('jwtToken');
            window.location.href = './login.html'; // ou autre selon ta page
        });
    }
});

async function fetchBadges() {
    try {
        const token = localStorage.getItem('jwtToken');

        const response = await fetch("https://arduinoooo.lol/badgesall", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const badges = await response.json();

        const container = document.getElementById("badges-container");
        container.innerHTML = '';

        if (response.ok) {
            if (badges.length === 0) {
                container.innerHTML = '<p>Aucun badge disponible.</p>';
            } else {
                badges.forEach(badge => {
                    const badgeElement = document.createElement("div");
                    badgeElement.classList.add("badge-card"); // Utilise la classe stylée

                    badgeElement.innerHTML = `
                        <h3>Badge ID : ${badge.badge_id}</h3>
                        <p><strong>Nom d'utilisateur :</strong> ${badge.name}</p>
                        <p><strong>Type d'accès :</strong> ${badge.level}</p>
                    `;

                    container.appendChild(badgeElement);
                });
            }
        } else {
            alert("Erreur : Impossible de récupérer les badges.");
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des badges :", error);
        alert("Une erreur s'est produite.");
    }
}

document.addEventListener("DOMContentLoaded", fetchBadges);
