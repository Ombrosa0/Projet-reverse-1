const axios = require('axios');
let urlApi = "http://localhost:3000"
function autoLogin() {
    axios.post(`${urlApi}/login`, {
        username: 'admin',
        password: 'admin123'
    }).then(res => {
        cachedToken = res.data.token;
        console.log('Token reçu :', cachedToken);

        return axios.get(`${urlApi}/badgesall`, {
            headers: {
                Authorization: `Bearer ${cachedToken}`
            }
        });
    }).then(data => {
        console.log(data.data);
    }).catch(err => {
        console.error('Erreur auto-login :', err.response?.data || err.message);
    });
}
autoLogin()