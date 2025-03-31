let isFetching = false;

async function fetchLastBadge() {
    if (isFetching) return;
    isFetching = true;

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
        console.log("Réponse API /last_badge :", result); // Debug

        if (response.ok && result.badge_id) {
            const { badge_id, name, level } = result;

            // Met à jour les champs de formulaire
            document.getElementById("badge_id").value = badge_id;
            document.getElementById("delete_badge_id").value = badge_id;
            document.getElementById("update_badge_id").value = badge_id;

            // Pré-remplit les champs de modification
            document.getElementById("update_name").value = name || "";
            document.getElementById("update_badgeLevel").value = level || "";

        } else {
            console.log("Aucun badge trouvé ou erreur API.");

            ["badge_id", "delete_badge_id", "update_badge_id", "update_name", "update_badgeLevel"].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = "Aucun badge trouvé";
            });
        }
    } catch (error) {
        console.error("Erreur lors de la récupération du dernier badge :", error);

        ["badge_id", "delete_badge_id", "update_badge_id", "update_name", "update_badgeLevel"].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = "Erreur de connexion";
        });

    } finally {
        isFetching = false;
    }
}


// Lors du chargement de la page
document.addEventListener("DOMContentLoaded", function () {
    fetchLastBadge();

    // Ajout des événements aux boutons de rafraîchissement
    ["refreshCreateBtn", "refreshDeleteBtn", "refreshModifBtn"].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener("click", fetchLastBadge);
    });
});

// Gestion de la création d'un badge
document.getElementById("badgeForm")?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const badgeData = {
        badge_id: document.getElementById("badge_id").value.trim(),
        name: document.getElementById("name").value.trim(),
        level: document.getElementById("level").value.trim()
    };

    if (!badgeData.badge_id || !badgeData.name || !badgeData.level) {
        alert("Tous les champs doivent être remplis.");
        return;
    }

    console.log("Données envoyées :", badgeData);

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch("https://arduinoooo.lol/create_badge", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(badgeData)
        });

        const result = await response.json();

        if (response.ok) {
            alert("Badge ajouté avec succès !");
            document.getElementById("badgeForm").reset();
        } else {
            alert("Erreur : " + (result.message || "Impossible d'ajouter le badge"));
        }
    } catch (error) {
        console.error("Erreur :", error);
        alert("Une erreur s'est produite.");
    }
});

// Suppression d'un badge
document.getElementById("deleteBadgeForm")?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const badgeId = document.getElementById("delete_badge_id").value.trim();
    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch("https://arduinoooo.lol/delete_badge", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ badge_id: badgeId })
        });

        const result = await response.json();

        if (response.ok) {
            alert("Badge supprimé avec succès !");
            document.getElementById("deleteBadgeForm").reset();
        } else {
            alert("Erreur : " + (result.error || "Impossible de supprimer le badge"));
        }
    } catch (error) {
        console.error("Erreur :", error);
        alert("Une erreur s'est produite.");
    }
});

// Modification d'un badge
document.getElementById("updateBadgeForm")?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const badgeData = {
        badge_id: document.getElementById("update_badge_id").value.trim(),
        name: document.getElementById("update_name").value.trim(),
        level: document.getElementById("update_badgeLevel").value
    };

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch("https://arduinoooo.lol/modif_badge", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(badgeData)
        });

        const result = await response.json();

        if (response.ok) {
            alert("Badge modifié avec succès !");
            document.getElementById("updateBadgeForm").reset();
        } else {
            alert("Erreur : " + (result.error || "Impossible de modifier le badge"));
        }
    } catch (error) {
        console.error("Erreur :", error);
        alert("Une erreur s'est produite.");
    }
});
