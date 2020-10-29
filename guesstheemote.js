const fetch = require("node-fetch");
const braille = require('./generatebraille.js');
const db = require('./database.js');
const emotes = require('./emotes.js');
const ascii = require('./ascii.js');

var games = {};

var reward = 10;

var maxRounds = 20;
var defaultRounds = 1;

var firstHintTime = 15000;
var secondHintTime = 30000;
var resolveTime = 45000;
var timeBetweenRounds = 4000;

var emoteOrigins;
loadOrigins().then(function(list){emoteOrigins=list;});


class Game {
    constructor(channel, mode, rounds, playSet){
        this.channel = channel;
        this.solution;
        this.mode = mode;
        this.rounds = rounds;
        this.roundsOverall = rounds;
        this.playSet = playSet;
        this.roundActive = false;
        this.firstHint;
        this.secondHint;
        this.resolve;
        this.originHints;
        this.originLastHint = false;
    }
    
    clearHints(){
        clearTimeout(this.firstHint);
        clearTimeout(this.secondHint);
        clearTimeout(this.resolve);
    }
    
    async setNewSolution(){
        this.solution = await getRandomEmote(this.playSet, this.mode);
    }
}

var modes = {
    global: ["ffzGlobal", "bttvGlobal", "twitchGlobal"],
    channel: ["ffzChannel", "bttvChannel", "twitchChannel"],
    all: ["ffzChannel", "bttvChannel", "twitchChannel", "ffzGlobal", "bttvGlobal", "twitchGlobal"]
};


module.exports = {
    guessTheEmote: function(channelObj, sayFunc, user, command){
        if (command[0] + command[1] === channelObj.prefix+"guessstop" && games.hasOwnProperty(channelObj.name)){
            games[channelObj.name].rounds = 1;
        }
        
        if (!getGameState(channelObj.name)){
            let newGame = createGameObject(channelObj, command[1], command[2]);
            if (newGame === -1){
                sayFunc(channelObj.name, '/me Invalid mode! Has to be "global", "channel", "all" or "origin" (e.g. '+channelObj.prefix+'guess all 5)');
                return;
            } else if (newGame === -2){
                sayFunc(channelObj.name, '/me No such emotes in this channel!');
                return;
            }
            games[channelObj.name] = newGame;
            startGame(channelObj, newGame, sayFunc);
        } else {
            if (!games[channelObj.name].roundActive){
                return;
            }
            if (getGameSolution(channelObj.name).toLowerCase() === command[0].toLowerCase()){
                let winString = "/me " + user['display-name'] + " guessed it right! It's "+ getGameSolution(channelObj.name) + " (+"+reward+"USh)";
                db.addUserPoints(user['user-id'], user['username'], reward);
                resolveRound(channelObj, games[channelObj.name], sayFunc, winString);
            } else {
                console.log(getGameSolution(channelObj.name));
            }
        }
    }
};


async function startGame(channelObj, gameObj, sayFunc){
    await gameObj.setNewSolution();
    gameObj.roundActive = true;
    
    gameObj.firstHint = setTimeout(function(){giveFirstHint(channelObj, gameObj, sayFunc);}, firstHintTime);
    gameObj.secondHint = setTimeout(function(){giveSecondHint(channelObj, gameObj, sayFunc);}, secondHintTime);
    let loseString = "/me It was " +gameObj.solution.name+ " . Disappointing performance :Z";
    gameObj.resolve = setTimeout(function(){resolveRound(channelObj, gameObj, sayFunc, loseString);}, resolveTime);
    
    if (gameObj.mode !== 'origin'){ 
        ascii.ascii("ascii", [gameObj.solution.url], false, ["-tr", "255"], null, null)
            .then((brailleString) => {
                if (brailleString === -1){
                    gameObj.clearHints();
                    startGame(channelObj, gameObj, sayFunc);
                } else {
                    channelObj.gameRunning = true;
                    channelObj.game = module.exports.guessTheEmote;
                    sayFunc(channelObj.name, '/me GUESS THE EMOTE! (' 
                            + modes[gameObj.mode] + ') [' 
                            + ((gameObj.roundsOverall-gameObj.rounds)+1) 
                            + '/' + gameObj.roundsOverall + ']');
                    sayFunc(channelObj.name, brailleString);
                }
            });
    } else {
        gameObj.originHints = gameObj.solution.text
                .replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g, '')
                .split(gameObj.solution.name).join('[THE EMOTE]')
                .split('. ')
                .filter(str => typeof str !== 'undefined' && str.trim() !== '');
        channelObj.gameRunning = true;
        channelObj.game = module.exports.guessTheEmote;
        sayFunc(channelObj.name, '/me Guess the emote [' 
                            + ((gameObj.roundsOverall-gameObj.rounds)+1) 
                            + '/' + gameObj.roundsOverall + '] : ' +getOriginHint(gameObj));
    }
}



function giveFirstHint(channelObj, gameObj, sayFunc){
    if (gameObj.mode === 'origin'){
        sayFunc(channelObj.name, "/me First Hint: " +getOriginHint(gameObj));
    } else {
        sayFunc(channelObj.name, "/me First Hint: It's a " +gameObj.solution.origin+ " emote :)");
    }
}

function giveSecondHint(channelObj, gameObj, sayFunc){
    if (gameObj.mode === 'origin'){
        sayFunc(channelObj.name, "/me Second Hint: " +getOriginHint(gameObj));
    } else {
        ascii.ascii("ascii", [gameObj.solution.url], false, [], null, null)
            .then((brailleString) => {
                if (brailleString === -1){
                    return;
                } else {
                    sayFunc(channelObj.name, '/me Second Hint: ');
                    sayFunc(channelObj.name, brailleString);
                }
            });
        }
}

function resolveRound(channelObj, gameObj, sayFunc, endString){
    gameObj.roundActive = false;
    gameObj.originLastHint = false;
    sayFunc(channelObj.name, endString);
    gameObj.clearHints();
    gameObj.rounds--;
    if (games[channelObj.name].rounds === 0){
        sayFunc(channelObj.name, '/me game ended nam');
        endGame(channelObj);
    } else {
        setTimeout(function(){startGame(channelObj, games[channelObj.name], sayFunc);}, timeBetweenRounds);
    }
}

function createGameObject(channelObj, mode, rounds){
    let emoteSet = [];
    
    if (mode === 'origin'){
        emoteSet = emoteOrigins;
    } else {
        if (!modes.hasOwnProperty(mode)){
            return -1;
        }
        for (let list of modes[mode]){
            if (modes['global'].includes(list)){
                emoteSet = emoteSet.concat(emotes.globalEmotes[list]);
            } else {
                emoteSet = emoteSet.concat(channelObj.emotes[list]);
            }
        }
    }
    
    if (typeof emoteSet === 'undefined' || emoteSet.length < 1){
        return -2;
    }
    
    rounds = setRounds(rounds);
    let newGame = new Game(channelObj.name, mode, rounds, emoteSet);
    return newGame;
}


async function getRandomEmote(emoteSet, mode){
    if (mode === 'origin'){
        return emoteSet[Math.floor(Math.random() * emoteSet.length)];
    }
    
    const backupEmote = {
        name:"FishMoley",
        url:"https://cdn.betterttv.net/emote/566ca00f65dbbdab32ec0544/2x",
        origin:"bttv"
    };
    let triesUntiBackup = 10;
    let emote = null;
    let trData = 0;
    
    while (trData === 0 || trData === 100){
        emote = emoteSet[Math.floor(Math.random() * emoteSet.length)];
        trData = await braille.getTransparencyData(emote.url);
        triesUntiBackup--;
        if (triesUntiBackup === 0){
            return backupEmote;
        }
    }
    return emote;
}


function setRounds(rounds){
    if (typeof rounds === 'undefined' || isNaN(parseInt(rounds)) || rounds <= defaultRounds){
        return defaultRounds;
    }else if(rounds >= maxRounds){
        return maxRounds;
    } else {
        return rounds;
    }
}


function endGame(channelObj){
    delete games[channelObj.name];
    channelObj.gameRunning = false;
}


function getGameState(channelName){
    return games.hasOwnProperty(channelName);
}


function getGameSolution(channelName){
    return games[channelName].solution.name;
}

async function loadOrigins(){
    const api = 'https://supinic.com/api/data/origin/list';
    let response = await fetch(api);
    let data = await response.json();
    return data.data;
}

function getOriginHint(gameObj){
    switch (gameObj.originHints.length){
        case 0:
            if (gameObj.originLastHint){
                return 'Its a '+ gameObj.solution.type + ' emote.';
            } else {
                gameObj.originLastHint = true;
                const hidePercent = 4/5;
                return '____'+gameObj.solution.name.substring(Math.floor(gameObj.solution.name.length*hidePercent), gameObj.solution.name.length);
            }
        default:
            let randomIndex = Math.floor(Math.random() * gameObj.originHints.length);
            let hintText = gameObj.originHints[randomIndex];
            gameObj.originHints.splice(randomIndex, 1);
            return hintText;
    }
}
