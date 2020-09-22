const fetch = require("node-fetch");
const db = require('./database.js');
const brailleData = require('./brailledata.js');
const braille = require('./generatebraille.js');
const emotes = require('./emotes.js');

var games = {};
var defaultCharacters = ['x', 'o'];

class Game {
    constructor(channel, sayFunc, player1, player1ID, player1Character, player2, stake){
        this.channel = channel;
        this.playerOne = {
            name: player1,
            id: player1ID,
            character: player1Character
        };
        this.playerTwo = {
            name: player2,
            id: null,
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
        this.nextRoundTimeout = {
            handle: null,
            waitTime: 3000
        };
        this.stake = stake;
        this.sayFunc = sayFunc;
        this.turn;
        this.field = {
            tl: "-",
            t: "-",
            tr: "-",
            ml: "-",
            m: "-",
            mr: "-",
            bl: "-",
            b: "-",
            br: "-"
        };
        this.looks = {
            "-": brailleData.ttt["-"].split(" "),
            vertLine: brailleData.ttt.vertLine,
            cellHeight: 5
        }    ;
        this.winner;
        this.loser;
        this.gameStarted = false;
        this.fieldTakenCooldown = 0;
        this.fieldTakenCooldownTime = 2;
    }
    
    randomStartTurn(){
        this.turn = [this.playerOne, this.playerTwo][Math.floor(Math.random() * 2)];
    }
    
    setDefaultLooks(player, index){
        player.character = defaultCharacters[index];
        this.looks[player.character] = brailleData.ttt[player.character].split(" ");
    }
    
    getPlayerByAttribute(attr, value){
        if (this.playerOne[attr] === value){
            return this.playerOne;
        } else if(this.playerTwo[attr] === value){
            return this.playerTwo;
        } else {
            return;
        }
    }
    
    getOtherPlayer(player){
        if (player === this.playerOne){
            return this.playerTwo;
        } else {
            return this.playerOne;
        }
    }
    
    turnToString(){
        let fieldString = "";
        let fieldArr = Object.values(this.field);
        for (let i=0; i<fieldArr.length; i+=3){
            for (let j=0; j< this.looks.cellHeight; j++){
                fieldString += [this.looks[fieldArr[i]][j], this.looks[fieldArr[i+1]][j], this.looks[fieldArr[i+2]][j]].join(this.looks.vertLine) + " ";
            }
        }
        return fieldString;
    }
    
    getEmptyCells(){
        let emptyList = [];
        for (let cell in this.field){
            if (this.field[cell] === "-"){
                emptyList.push(cell);
            }
        }
        return emptyList;
    }
    
    setRandomCell(character){
        let emptyCells = this.getEmptyCells();
        let randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        if (this.field[randomCell] !== '-'){
            this.setRandomCell(character);
        } else {
            this.field[randomCell] = character;
        }
    }
    
    checkIfGameOver(){
        let character;
        let fieldArr = Object.values(this.field);
        function checkCharacterLine(character, pos, posOffSet){
            if (character !== "-" && fieldArr[pos+(posOffSet*1)] === character && fieldArr[pos+(posOffSet*2)] === character){
                return true;
            } else {
                return false;
            }
        }
        for (let i=0; i<fieldArr.length; i+=3){
            character = fieldArr[i];
            if (checkCharacterLine(character, i, 1)){
                this.winner = this.getPlayerByAttribute('character', character);
            }
        }
        for (let j=0; j<3; j++){
            character = fieldArr[j];
            if (checkCharacterLine(character, j, 3)){
                this.winner = this.getPlayerByAttribute('character', character);
            }
        }
        character = fieldArr[0];
        if (checkCharacterLine(character, 0, 4)){
            this.winner = this.getPlayerByAttribute('character', character);
        }
        character = fieldArr[2];
        if (checkCharacterLine(character, 2, 2)){
            this.winner = this.getPlayerByAttribute('character', character);
        }
        
        if (this.getEmptyCells().length === 0 && typeof this.winner === 'undefined'){
            return 0;
        } else if (typeof this.winner !== 'undefined'){
            this.loser = this.getOtherPlayer(this.winner);
            return 1;
        } else {
            return -1;
        }
    }
}


module.exports = {
    tictactoe: function(channelObj, sayFunc, user, command){
        if (getGameState(channelObj.name) && command[0] === channelObj.prefix+'concede'){
            let gameObj = games[channelObj.name];
            if (gameObj.gameStarted){
                clearTimeout(gameObj.waitForInput.handle);
                clearTimeout(gameObj.nextRoundTimeout.handle);
                gameObj.loser = gameObj.getPlayerByAttribute('name', user['username'].toLowerCase());
                gameObj.winner = gameObj.getOtherPlayer(gameObj.loser);
                sayFunc(channelObj.name, "/me " + user['username'] + " has given up :/");
                settleGameEnd(channelObj, gameObj, 1);
            } else {
                clearTimeout(gameObj.waitForAccept.handle);
                sayFunc(channelObj.name, "/me " + user['username'] + " Does not want to play :(");
                endGame(channelObj);
            }
            return;
        }
        
        if (!getGameState(channelObj.name)){
            if (typeof command[1] === 'undefined' || typeof command[2] === 'undefined'){
                sayFunc(channelObj.name, "/me Correct syntax is: !ttt <enemy> <points> [<emote>]");
                return;
            }
            let newGame = new Game(channelObj.name, sayFunc, user['username'].toLowerCase(), user['user-id'], command[3], command[1].toLowerCase(), command[2]);
            games[channelObj.name] = newGame;
            channelObj.gameRunning = true;
            channelObj.game = module.exports.tictactoe;
            
            checkInputValues(channelObj, newGame);
        } else {
            let gameObj = games[channelObj.name];
            if (gameObj.waitForAccept.status 
                    && command[0] === channelObj.prefix+'accept' 
                    && user['username'].toLowerCase() === gameObj.playerTwo.name.toLowerCase()){
                gameObj.playerTwo.id = user['user-id'];
                gameObj.waitForAccept.status = false;
                clearTimeout(gameObj.waitForAccept.handle);
                gameObj.playerTwo.character = command[1];
                checkCharacters(channelObj, gameObj);
                gameObj.randomStartTurn();
                gameObj.gameStarted = true;
                setTimeout(function(){
                    gameObj.sayFunc(channelObj.name, gameObj.turnToString());
                    startRound(channelObj, gameObj);
                }, 500);
            } else if (gameObj.waitForInput.status 
                    && user['username'].toLowerCase() === gameObj.turn.name.toLowerCase() 
                    && Object.keys(gameObj.field).includes(command[0].toLowerCase())){
                if (!gameObj.getEmptyCells().includes(command[0].toLowerCase())){
                    if (Math.round(new Date().getTime() / 1000) > gameObj.fieldTakenCooldown){
                        sayFunc(channelObj.name, "/me That field is already taken!");
                        gameObj.fieldTakenCooldown = Math.round(new Date().getTime() / 1000) + gameObj.fieldTakenCooldownTime;
                    }
                    return;
                }
                
                gameObj.field[command[0].toLowerCase()] = gameObj.turn.character;
                postRoundCheck(channelObj, gameObj);
            }
        }
    }
};


function startRound(channelObj, gameObj){
    gameObj.sayFunc(channelObj.name, "/me It's " + gameObj.turn.name + "'s ( "+ gameObj.turn.character + " ) turn! Options: (" + gameObj.getEmptyCells() + ")");
    
    gameObj.waitForInput.status = true;
    gameObj.waitForInput.handle = setTimeout(function(){gameTurnTimeout(channelObj, gameObj);}, gameObj.waitForInput.waitTime);
}


function settleGameEnd(channelObj, gameObj, result){
    if (result === 0){
        gameObj.sayFunc(channelObj.name, "/me Tie! No one loses USh :)");
    } else {
        gameObj.sayFunc(channelObj.name, "/me " + gameObj.winner.name + " won! He wins " + gameObj.stake + " USh!");
        if (gameObj.stake === 0){
        } else {
            db.addUserPoints(gameObj.winner.id, gameObj.winner.name, gameObj.stake);
            db.addUserPoints(gameObj.loser.id, gameObj.loser.name, -gameObj.stake);        
        }
    }
    endGame(channelObj);
}


function postRoundCheck(channelObj, gameObj){
    gameObj.waitForInput.status = false;
    clearTimeout(gameObj.waitForInput.handle);
    gameObj.sayFunc(channelObj.name, gameObj.turnToString());
    let gameOverStatus = gameObj.checkIfGameOver();
    if (gameOverStatus === -1){
        gameObj.turn = gameObj.getOtherPlayer(gameObj.turn);
        gameObj.nextRoundTimeout.handle = setTimeout(function(){startRound(channelObj, gameObj);}, gameObj.nextRoundTimeout.waitTime);
    } else {
        settleGameEnd(channelObj, gameObj, gameOverStatus);
    }
}

function gameTurnTimeout(channelObj, gameObj){
    gameObj.sayFunc(channelObj.name, "/me " + gameObj.turn.name + " did not complete his turn in time. A random move was done! :Z");
    gameObj.setRandomCell(gameObj.turn.character);
    postRoundCheck(channelObj, gameObj);
}


function gameRequestTimeout(channelObj, gameObj, initial){
    if (initial){
        gameObj.sayFunc(channelObj.name, "/me " + gameObj.playerTwo.name + ", " + gameObj.playerOne.name + " wants to play a game of tictactoe! Write !accept <emote> to play :)");
        gameObj.waitForAccept.handle = setTimeout(function(){gameRequestTimeout(channelObj, gameObj, false);}, gameObj.waitForAccept.waitTime);
        gameObj.waitForAccept.status = true;
    } else {
        gameObj.sayFunc(channelObj.name, "/me " + gameObj.playerTwo.name + " did not accept the request in time!");
        endGame(channelObj);
    }
}


async function checkInputValues(channelObj, gameObj){
    let userExists = await checkUserExistence(channelObj, gameObj.playerTwo.name);
    
    if (!userExists){
        return -1;
    }
    
    db.getPoints(channelObj, 'display_name', gameObj.playerOne.name, checkPoints);
    db.getPoints(channelObj, 'display_name', gameObj.playerTwo.name, checkPoints);
    
    return 0;
}


function checkUserExistence(channelObj, user){
    let api = 'https://tmi.twitch.tv/group/user/'+ channelObj.name.substring(1) +'/chatters';
    return fetch(api)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            for (let elem in data.chatters) {
                if (data.chatters[elem].includes(user.toLowerCase())){
                   return true;
                }
            }
            games[channelObj.name].sayFunc(channelObj.name, "/me " + user + ' cannot be found in this channel!');
            endGame(channelObj);
            return false;
        })
        .catch((err) => {
            console.error(err);
        });
}


function checkCharacters(channelObj, gameObj){
    [gameObj.playerOne, gameObj.playerTwo].forEach(async function(player, i){
        if (typeof player.character === 'undefined' || (i === 1 && player.character === gameObj.playerOne.character)){
            gameObj.setDefaultLooks(player, i);
            return;
        }
        
        let emote = [].concat.apply([], Object.values(channelObj.emotes).concat(Object.values(emotes.globalEmotes))).find(emote => emote.name === player.character);
        if (typeof emote === 'undefined'){
            emote = await db.getEmoteByName(player.character);
            if (emote === -1){
                emote = emotes.createNewEmote(player.character, emotes.getEmojiURL(player.character), 'emoji');
            }
        }
        
        gameObj.setDefaultLooks(player, i);
        braille.processImage(emote.url, 150, 18, 18)
            .then((brailleString) => {
                if (typeof brailleString !== 'undefined'){
                    player.character = emote.name;
                    gameObj.looks[player.character] = brailleString.split(" ");
                }
            });
    });
}


function checkPoints(channelObj, player, points){
    if (typeof this.counter === 'undefined'){
        this.counter = 1;
        this.err = false;
    } else {
        this.counter++;
    }
    
    if (typeof games[channelObj.name] !== 'undefined' && this.err === false){
        if (isNaN(parseInt(games[channelObj.name].stake)) || games[channelObj.name].stake > points){
            games[channelObj.name].sayFunc(channelObj.name, "/me " + player + ' does not have enough USh! You can use 0 to play for nothing :)');
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