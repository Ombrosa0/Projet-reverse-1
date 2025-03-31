document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch('https://arduinoooo.lol/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const contentType = response.headers.get("content-type");
        let data = {};

        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.warn("Réponse non JSON reçue :", text);
            alert("Erreur de connexion : réponse inattendue du serveur.");
            return;
        }

        console.log("Statut HTTP:", response.status);
        console.log("Réponse JSON:", data);

        if (response.ok && data.token) {
            localStorage.setItem('jwtToken', data.token);
            window.location.href = 'index.html';
        } else {
            alert('Erreur de connexion : ' + (data.message || 'Identifiants incorrects.'));
        }

    } catch (error) {
        console.error("Erreur :", error);
        alert('Erreur lors de la connexion (serveur injoignable ?).');
    }
});
// });

