const braille = require('./generatebraille.js');
var games = {};

var maxRounds = 20;
var defaultRounds = 1;

var firstHint;
var firstHintTime = 15000;
var secondHint;
var secondHintTime = 30000;
var resolve;
var resolveTime = 45000;


class Game {
    constructor(channel, mode, rounds, playSet){
        this.channel = channel;
        this.solution;
        this.mode = mode;
        this.rounds = rounds;
        this.roundsOverall = rounds;
        this.playSet = playSet;
        this.roundActive = false;
    }
    
    setNewSolution(){
        this.solution = getRandomEmote(this.playSet);
    }
}

var modes = {
    global: ["ffzGlobal", "bttvGlobal", "twitchGlobal"],
    channel: ["ffzChannel", "bttvChannel", "twitchChannel"],
    all: ["ffzChannel", "bttvChannel", "twitchChannel", "ffzGlobal", "bttvGlobal", "twitchGlobal"]
};


module.exports = {
    guessTheEmote: function(channelObj, sayFunc, user, command){
        if (command[0] + command[1] === "!guessstop"){
            games[channelObj.name].rounds = 1;
        }
        
        if (!getGameState(channelObj.name)){
            let newGame = createGameObject(channelObj, command[1], command[2]);
            if (newGame === -1){
                sayFunc(channelObj.name, '/me Invalid mode! Has to be "global", "channel" or "all" (e.g. !guess all)');
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
            if (new RegExp(getGameSolution(channelObj.name)).test(command[0])){
                let winString = "/me " + user['display-name'] + " guessed it right! It's "+ getGameSolution(channelObj.name);
                resolveRound(channelObj, games[channelObj.name], sayFunc, winString);
            } else {
                console.log(getGameSolution(channelObj.name));
            }
        }
    }
};


function startGame(channelObj, gameObj, sayFunc){
    gameObj.roundActive = true;
    firstHint = setTimeout(function(){giveFirstHint(channelObj, gameObj, sayFunc);}, firstHintTime);
    secondHint = setTimeout(function(){giveSecondHint(channelObj, gameObj, sayFunc);}, secondHintTime);
    
    gameObj.setNewSolution();
    let loseString = "/me It was " +gameObj.solution.name+ " . Maybe open your eyes next time :)";
    resolve = setTimeout(function(){resolveRound(channelObj, gameObj, sayFunc, loseString);}, resolveTime);
    
    braille.processImage(gameObj.solution.url)
        .then((brailleString) => {
            if (typeof brailleString === 'undefined'){
                gameObj.setNewSolution();
                clearTimeouts();
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
}



function giveFirstHint(channelObj, gameObj, sayFunc){
    sayFunc(channelObj.name, "/me First Hint: It's a " +gameObj.solution.origin+ " emote :)");
}

function giveSecondHint(channelObj, gameObj, sayFunc){
    braille.processImage(gameObj.solution.url, 150)
        .then((brailleString) => {
            if (typeof brailleString === 'undefined'){
                return;
            } else {
                sayFunc(channelObj.name, '/me Second Hint: ');
                sayFunc(channelObj.name, brailleString);
            }
        });
}

function resolveRound(channelObj, gameObj, sayFunc, endString){
    gameObj.roundActive = false;
    sayFunc(channelObj.name, endString);
    clearTimeouts();
    gameObj.rounds--;
    if (games[channelObj.name].rounds === 0){
        sayFunc(channelObj.name, '/me game ended nam');
        endGame(channelObj);
    } else {
        setTimeout(function(){startGame(channelObj, games[channelObj.name], sayFunc);}, 3000);
    }
}

function clearTimeouts(){
    clearTimeout(firstHint);
    clearTimeout(secondHint);
    clearTimeout(resolve);
}


function createGameObject(channelObj, mode, rounds){
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
    
    rounds = setRounds(rounds);
    let newGame = new Game(channelObj.name, mode, rounds, emoteSet);
    return newGame;
}


function getRandomEmote(emoteSet){
    let randomNumber = Math.floor(Math.random() * emoteSet.length);
    let emote = emoteSet[randomNumber];
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


