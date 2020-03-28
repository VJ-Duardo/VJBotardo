const fetch = require("node-fetch");
const db = require('./database.js');

var games = {};

class Game {
    constructor(channel, sayFunc, player1, player2, stake){
        this.channel = channel;
        this.playerOne = {
            name: player1,
            character: 'X'
        };
        this.playerTwo = {
            name: player2,
            character: 'O'
        };
        this.waitForAccept = false;
        this.stake = stake;
        this.sayFunc = sayFunc;
    }
}


module.exports = {
    tictactoe: async function(channelObj, sayFunc, user, command){
        if (!getGameState(channelObj.name)){
            let newGame = new Game(channelObj.name, sayFunc, user['display-name'], command[1], command[2]);
            games[channelObj.name] = newGame;
            
            await checkInputValues(channelObj, newGame);
            if (!getGameState(channelObj.name)){
                console.log("err state");
                channelObj.gameRunning = false;
                return;
            }
            console.log("all good");
        }
    }
};


async function checkInputValues(channelObj, gameObj){
    let userExists = await checkUserExistence(channelObj.name, gameObj.playerTwo.name);
    
    if (!userExists){
        return -1;
    }
    
    for (const name of [gameObj.playerOne.name, gameObj.playerTwo.name]){
        db.getPoints(channelObj.name, name, checkPoints);
        if (!getGameState(channelObj.name)){
            return -2;
        }
    }
    
    return 0;
}


function sendGameRequest(){
    
}



function getGameState(channelName){
    return games.hasOwnProperty(channelName);
}



function checkUserExistence(channel, user){
    let api = 'https://tmi.twitch.tv/group/user/'+ channel.substring(1) +'/chatters';
    return fetch(api)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            for (let elem in data.chatters) {
                if (data.chatters[elem].includes(user)){
                   return true;
                }
            }
            games[channel].sayFunc(channel, user + ' cannot be found in this channel!');
            endGame(channel);
            return false;
        })
        .catch((err) => {
            console.error(err);
        });
}


function checkPoints(channel, player, points){
    if (typeof games[channel] === 'undefined'){
        return;
    }
    if (games[channel].stake > points){
        games[channel].sayFunc(channel, player + ' doesnt have enough points!');
        endGame(channel);
    }
}

function endGame(channel){
    delete games[channel];
}