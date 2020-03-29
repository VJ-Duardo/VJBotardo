const fetch = require("node-fetch");
const db = require('./database.js');
const brailleData = require('./brailledata.js');

var games = {};

class Game {
    constructor(channel, sayFunc, player1, player2, stake){
        this.channel = channel;
        this.playerOne = {
            name: player1,
            character: 'x'
        };
        this.playerTwo = {
            name: player2,
            character: 'o'
        };
        this.waitForAccept = {
            status: false,
            handle: null,
            waitTime: 30000
        };
        this.waitForInput = {
            status: false,
            handle: null,
            waitTime: 15000
        };
        this.stake = stake;
        this.sayFunc = sayFunc;
        this.turn;
        this.field = 
                [["-", "-", "-"],
                ["-", "-", "-"],
                ["-", "-", "-"]];
        this.looks = {};
    }
    
    randomStartTurn(){
        this.turn = [this.playerOne, this.playerTwo][Math.floor(Math.random() * 2)];
    }
    
    setLooks(){
        this.looks[this.playerOne.character] = brailleData.ttt[this.playerOne.character].split(" ");
        this.looks[this.playerTwo.character] = brailleData.ttt[this.playerTwo.character].split(" ");
        this.looks["-"] = brailleData.ttt["-"].split(" ");
        this.looks.vertLine = '⠄';
        this.looks.cellHeight = 5;
    }
    
    turnToString(){
        let fieldString = "";
        for (const line of this.field){
            for (let i=0; i< this.looks.cellHeight; i++){
                fieldString+= [this.looks[line[0]][i],this.looks[line[1]][i],this.looks[line[2]][i]].join(this.looks.vertLine) + " ";
            }
        }
        return fieldString;
    }
}


module.exports = {
    tictactoe: function(channelObj, sayFunc, user, command){
        if (!getGameState(channelObj.name)){
            if (typeof command[1] === 'undefined' || typeof command[2] === 'undefined'){
                sayFunc(channelObj.name, "Correct syntax is: !ttt <enemy> <points>");
                return;
            }
            let newGame = new Game(channelObj.name, sayFunc, user['display-name'], command[1], command[2]);
            games[channelObj.name] = newGame;
            channelObj.gameRunning = true;
            channelObj.game = module.exports.tictactoe;
            
            checkInputValues(channelObj, newGame);
        } else {
            if (games[channelObj.name].waitForAccept.status && command[0] === '!accept' && user['display-name'].toLowerCase() === games[channelObj.name].playerTwo.name.toLowerCase()){
                games[channelObj.name].waitForAccept.status = false;
                clearTimeout(games[channelObj.name].waitForAccept.handle);
                games[channelObj.name].setLooks();
                sayFunc(channelObj.name, games[channelObj.name].turnToString());
                console.log("startRound here");
                //startRound();
            } else {
                console.log(games[channelObj.name]);
                console.log("ffs");
            }
        }
    }
};


function startRound(channelObj, gameObj){
    gameObj.printTurn;
    gameObj.sayFunc(channelObj.name, "It's " + gameObj.turn.name + "'s turn!");
}


async function checkInputValues(channelObj, gameObj){
    let userExists = await checkUserExistence(channelObj, gameObj.playerTwo.name);
    
    if (!userExists){
        return -1;
    }
    
    db.getPoints(channelObj, gameObj.playerOne.name, checkPoints);
    db.getPoints(channelObj, gameObj.playerTwo.name, checkPoints);
    
    return 0;
}


function gameRequestTimeout(channelObj, gameObj, initial){
    if (initial){
        gameObj.sayFunc(channelObj.name, gameObj.playerTwo.name + ", " + gameObj.playerOne.name + " wants to play a game of tictactoe! Write !accept to play :)");
        gameObj.waitForAccept.handle = setTimeout(function(){gameRequestTimeout(channelObj, gameObj, false);}, gameObj.waitForAccept.waitTime);
        gameObj.waitForAccept.status = true;
    } else {
        gameObj.sayFunc(channelObj.name, gameObj.playerTwo.name + " did not accept the request in time!");
        endGame(channelObj);
    }
}



function checkUserExistence(channelObj, user){
    let api = 'https://tmi.twitch.tv/group/user/'+ channelObj.name.substring(1) +'/chatters';
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
            games[channelObj.name].sayFunc(channelObj.name, user + ' cannot be found in this channel!');
            endGame(channelObj);
            return false;
        })
        .catch((err) => {
            console.error(err);
        });
}


function checkPoints(channelObj, player, points){
    if (typeof this.counter === 'undefined'){
        this.counter = 1;
        this.err = false;
    } else {
        this.counter++;
    }
    console.log(this.counter);
    console.log(this.err);
    
    if (typeof games[channelObj.name] !== 'undefined' && this.err === false){
        if (isNaN(parseInt(games[channelObj.name].stake)) || games[channelObj.name].stake > points){
            games[channelObj.name].sayFunc(channelObj.name, player + ' doesnt have enough points!');
            this.err = true;
        }
    }
        
    if (this.counter === 2){
        if (this.err === false){
            gameRequestTimeout(channelObj, games[channelObj.name], true);
        } else {
            endGame(channelObj);
        }
        this.counter = 0;
        this.err = false;
    }
}




function getGameState(channelName){
    return games.hasOwnProperty(channelName);
}


function endGame(channelObj){
    delete games[channelObj.name];
    channelObj.gameRunning = false;
}