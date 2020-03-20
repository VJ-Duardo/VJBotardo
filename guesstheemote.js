const fetch = require("node-fetch");
const sizes = ['4', '2', '1'];

var games = {};


class Game {
    constructor(channel, solution){
        this.channel = channel;
        this.solution = solution;
    }
}


module.exports = {
    getRandomUrl: function(channelObj){
        let randomNumber = Math.floor(Math.random() * channelObj.ffzEmotes.length);
        let emote = channelObj.ffzEmotes[randomNumber];
        for (const size of sizes){
            if (emote['urls'].hasOwnProperty(size)){
                let newGame = new Game(channelObj.name, emote['name']);
                games[channelObj.name] = newGame;
                return 'https:'+emote['urls'][size];
            }
        }
    },
    loadEmotes: function(channelObj){
        let ffzChannel = 'https://api.frankerfacez.com/v1/room/' + channelObj.name.substring(1);

        return get_json_prom(ffzChannel)
            .then((ffObj) => {
                if (ffObj.hasOwnProperty("error")){
                    return;
                }
                console.log('ffz in '+ channelObj.name +' loaded!');
                return ffObj['sets'][ffObj['room']['set']]['emoticons'];
            });
    },
    endGame: function(channelName){
        delete games[channelName];
    },
    getGameState: function(channelName){
        return games.hasOwnProperty(channelName);
    },
    getGameSolution: function(channelName){
        return games[channelName].solution;
    }
};

function get_json_prom(url){
    return fetch(url)
            .then(response => response.json())
            .then(json => (json));
}

