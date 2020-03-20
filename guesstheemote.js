const fetch = require("node-fetch");
const sizes = ['4', '2', '1'];

var ffzEmotes = [];
var gameRunning = false;
var solution = "";

module.exports = {
    getRandomUrl: function(channel){
        gameRunning = true;
        let randomNumber = Math.floor(Math.random() * ffzEmotes.length);
        let emote = ffzEmotes[randomNumber];
        for (const size of sizes){
            if (emote['urls'].hasOwnProperty(size)){
                solution  = emote['name'];
                return 'https:'+emote['urls'][size];
            }
        }
    },
    loadEmotes: function(){
        let ffzChannel = 'https://api.frankerfacez.com/v1/room/fabzeef';

        get_json_prom(ffzChannel)
            .then((channelObj) => {
                if (channelObj.hasOwnProperty("error")){
                    return;
                }
                ffzEmotes = channelObj['sets'][channelObj['room']['set']]['emoticons'];
                console.log('ffz loaded!');
            });
    },
    setGameState: function(state){
        gameRunning = state;
    },
    getGameState: function(){
        return gameRunning;
    },
    getGameSolution: function(){
        return solution;
    }
};

function get_json_prom(url){
    return fetch(url)
            .then(response => response.json())
            .then(json => (json));
}

