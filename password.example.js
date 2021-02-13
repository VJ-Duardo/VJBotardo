const fetch = require("node-fetch");
const db = require('./database.js');

module.exports = {
    password: "oauth:kjndfglkmsdkmfsoldkmflkm",
    authToken: "",
    clientId: "jklhndsfgkjhbndskfjghndfg",
    clientSecret: "jhbjshbdfjhaksbdfkjhbsdfkjhbsdf",
    gitHubToken: "jkhbasdfjkhbjkasdhbfjkhasdbf",
    setNewAppAccessToken: async function(){
        const url = 'https://id.twitch.tv/oauth2/token?client_id='+module.exports.clientId+'&client_secret='+module.exports.clientSecret+'&grant_type=client_credentials';
        let response = await fetch(url, {method: 'POST'});
        let data = await response.json();
        db.setToken(data['access_token']);
        module.exports.authToken = data['access_token'];
    },
    loadAppAccessToken: function(){
        db.getAllData(function(token){
            module.exports.authToken = token;
        },'IMPORTANT');
    }
};
