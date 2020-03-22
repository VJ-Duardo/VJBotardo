const braille = require('./generatebraille.js');
var games = {};


class Game {
    constructor(channel, solution){
        this.channel = channel;
        this.solution = solution;
    }
}

var modes = {
    global: ["ffzGlobal", "bttvGlobal", "twitchGlobal"],
    channel: ["ffzChannel", "bttvChannel", "twitchChannel"],
    all: ["ffzChannel", "bttvChannel", "twitchChannel", "ffzGlobal", "bttvGlobal", "twitchGlobal"]
};


module.exports = {
    guessTheEmote: function(channelObj, sayFunc, mode, message="", user=""){
        if (!getGameState(channelObj.name)){
            let emote = getRandomUrl(channelObj, mode);
            if (emote === -1){
                sayFunc(channelObj.name, '/me Invalid mode! Has to be "global", "channel" or "all"');
                return;
            } else if (emote === -2){
                sayFunc(channelObj.name, '/me No such emotes in this channel!');
                return;
            }
            braille.processImage(emote)
                .then((brailleString) => {
                    if (typeof brailleString === 'undefined'){
                        endGame(channelObj.name);
                        this.guessTheEmote(channelObj, sayFunc, mode);
                    } else {
                        channelObj.gameRunning = true;
                        channelObj.game = this.guessTheEmote;
                        sayFunc(channelObj.name, '/me GUESS THE EMOTE!');
                        sayFunc(channelObj.name, brailleString);
                    }
                });
        } else {
            if (message === getGameSolution(channelObj.name)){
                sayFunc(channelObj.name, "/me " + user['display-name'] + " guessed it right! It's "+ getGameSolution(channelObj.name));
                endGame(channelObj.name);
                channelObj.gameRunning = false;
            } else {
                console.log(getGameSolution(channelObj.name));
            }
        }
    }
};

function getRandomUrl(channelObj, mode){
    if (!modes.hasOwnProperty(mode)){
        return -1;
    }
    let emoteSet = [];
    for (let list of modes[mode]){
        if (typeof list === 'undefined'){
            continue;
        }
        emoteSet = emoteSet.concat(channelObj.emotes[list]);
    }
    if (typeof emoteSet === 'undefined' || emoteSet.length < 1){
        return -2;
    }
    
    let randomNumber = Math.floor(Math.random() * emoteSet.length);
    let emote = emoteSet[randomNumber];
        
    let newGame = new Game(channelObj.name, emote.name);
    games[channelObj.name] = newGame;
    return emote.url;
}

function endGame(channelName){
    delete games[channelName];
}

function getGameState(channelName){
    return games.hasOwnProperty(channelName);
}

function getGameSolution(channelName){
    return games[channelName].solution;
}


