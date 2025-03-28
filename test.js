const axios = require('axios');
const PORT = 3000;

function autoLogin() {
    axios.post(`http://localhost:${PORT}/login`, {
        username: 'admin',
        password: 'admin123'
    }).then(res => {
        cachedToken = res.data.token;
        console.log('Token reçu :', cachedToken);

        return axios.get(`http://localhost:${PORT}/profile`, {
            headers: {
                Authorization: `Bearer ${cachedToken}`
            }
        });
    }).then(profileRes => {
        console.log('Réponse /profile :', profileRes.data);
    }).catch(err => {
        console.error('Erreur auto-login :', err.response?.data || err.message);
    });
}
autoLogin()