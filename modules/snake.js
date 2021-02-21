const braille = require('./handlers/generatebraille.js');
const db = require('./handlers/database.js');
const { createCanvas } = require('canvas');

const fieldWidth = 60;
const fieldHeight = 64;
        
const elemWidth = 6;
const elemHeight = 8;

const refreshRate = 1000;

const appleChance = 0.30;
const appleMax = 2;
const applePoints = 1;

const ushReward = 10;
const winningBonus = 500;


const elemWidthRoyale = 2;
const elemHeightRoyale = 2;

const maxRoyalePlayers = 4;
const minRoyalePlayers = 2;

const ushMaxRewardRoyale = 100;

const refreshRateRoyale = 750;

const timeToStart = 3000;
const timeToWait = 30000;

const gapChance = 0.85;

var games = {};

class Game {
    constructor(channelObj, sayFunc, playerName, playerID, allMode=false){
        this.channelObj = channelObj;
        this.sayFunc = sayFunc;
        this.player = {
            name: playerName,
            id: playerID
        };
        this.allMode = allMode;
        this.points = 0;
        this.apples = {};
        this.snake = new Snake("black", elemWidth, elemHeight);
        this.turnDone = false;
        this.canvas = createCanvas(fieldWidth, fieldHeight);
        this.context = this.canvas.getContext('2d');
        this.updateInterval = setInterval(function(){update(channelObj.name);}, refreshRate);;
    }
    
    drawCircle(x, y, r, color){
        this.context.beginPath();
        this.context.arc(x, y, r, 0, 2 * Math.PI);
        this.context.fillStyle = color;
        this.context.fill();
        this.context.lineWidth = 0.1;
        this.context.stroke();
    }
    
    drawRect(x, y, width, height, color){
        this.context.fillStyle = color;
        this.context.fillRect(x, y, width, height);
    }
    
    clearField(x, y, width, height){
        this.context.clearRect(x, y, width, height);
    }
    
    checkGameOver(){
        return (this.snake.isOutOfBounds(fieldWidth, fieldHeight)
                || this.snake.isCellTaken(this.snake.head.x, this.snake.head.y));
    }
    
    
    manageApples(){
        if (Math.random() >= appleChance || Object.values(this.apples).length >= appleMax){
            return;
        }
        
        let freeCell = this.getFreeCell();
        if (freeCell === -1){
            return;
        } else {
            this.apples[freeCell] = (new Apple(freeCell[0], freeCell[1], elemWidth, elemHeight, "black", applePoints));
            this.apples[freeCell].drawCell(this);
        }
    }
    
    getFreeCell(){
        let freeCells = [];
        for (let x = 0; x < fieldWidth; x+= elemWidth){
            for (let y = 0; y < fieldHeight; y += elemHeight){
                if ((!this.snake.isCellTaken(x, y)) 
                        && !(this.snake.head.x === x && this.snake.head.y === y)
                        && !this.apples.hasOwnProperty([x, y])){
                    freeCells.push([x, y]);
                }
            }
        }
        if (freeCells.length < 1)
            return -1;
        else
            return freeCells[Math.floor(Math.random() * freeCells.length)];
    }
    
    processInput(input){
        if (this.turnDone)
            return;

        switch(input){
            case "a":
                if (this.snake.direction !== "east")
                    this.snake.direction = "west";
                break;
            case "w":
                if (this.snake.direction !== "south")
                    this.snake.direction = "north";
                break;
            case "d":
                if (this.snake.direction !== "west")
                    this.snake.direction = "east";
                break;
            case "s":
                if (this.snake.direction !== "north")
                    this.snake.direction = "south";
                break;
            default:
                return -1;
        }
        this.turnDone = true;
    }
}

class Player {
    constructor(id, name){
        this.id = id;
        this.name = name;
        this.turnDone = false;
        this.snake;
        this.out = false;
        this.place = 1;
    }
    
    setSnake(x, y, direction){
        this.snake = new Snake("black", elemWidthRoyale, elemHeightRoyale, x, y, direction);
    }
}

class GameRoyale extends Game{
    constructor(channelObj, sayFunc, playerName, playerID){
        super(channelObj, sayFunc, playerName, playerID, false);
        this.players = {};
        this.players[playerID] = new Player(playerID, playerName);
        this.players[playerID].setSnake();
        clearInterval(this.updateInterval);
        let _this = this;
        this.waitForJoin = {
            status: true,
            handle: setTimeout(function(){_this.resolveTimeUp();}, timeToWait)
        };
    }
    
    addPlayer(playerName, playerID){
        if (Object.keys(this.players).length === maxRoyalePlayers || this.players.hasOwnProperty(playerID)){
            return;
        } else {
            let newPlayer = new Player(playerID, playerName);
            this.players[playerID] = newPlayer;
            switch(Object.keys(this.players).length){
                case 2:
                    this.sayFunc(this.channelObj.name, `/me [2/${maxRoyalePlayers}] ${playerName}, you are starting from the bottom right!`);
                    newPlayer.setSnake(fieldWidth-elemWidthRoyale, fieldHeight-elemHeightRoyale, "west");
                    break;
                case 3:
                    this.sayFunc(this.channelObj.name, `/me [3/${maxRoyalePlayers}] ${playerName}, you are starting from the top right!`);
                    newPlayer.setSnake(fieldWidth-elemWidthRoyale, 0, "south");
                    break;
                case 4:
                    this.sayFunc(this.channelObj.name, `/me [4/${maxRoyalePlayers}] ${playerName}, you are starting from the bottom left! Game is starting in a few seconds...`);
                    newPlayer.setSnake(0, fieldHeight-elemHeightRoyale, "north");
                    clearTimeout(this.waitForJoin.handle);
                    let _this = this;
                    setTimeout(function(){_this.resolveTimeUp();}, timeToStart);
                    break;
            }
        }
    }
    
    getAlivePlayers() {
        let alive = 0;
        for (let obj of Object.values(this.players)){
            if (!obj.out)
                alive++;
        }
        return alive;
    }
    
    resolveTimeUp(){
        if (Object.keys(this.players).length >= minRoyalePlayers){
            let _this = this;
            this.waitForJoin.status = false;
            this.updateInterval = setInterval(function(){_this.update();}, refreshRateRoyale);
        } else {
            this.sayFunc(this.channelObj.name, "/me Seems like not enough people have joined :(");
            this.channelObj.gameRunning = false;
            delete games[this.channelObj.name];
        }
    }
      
    processInput(id, input){
        let player = this.players[id];
        if (player.turnDone || player.out)
            return;

        switch(input.toLowerCase()){
            case "a":
                if (player.snake.direction !== "east")
                    player.snake.direction = "west";
                break;
            case "w":
                if (player.snake.direction !== "south")
                    player.snake.direction = "north";
                break;
            case "d":
                if (player.snake.direction !== "west")
                    player.snake.direction = "east";
                break;
            case "s":
                if (player.snake.direction !== "north")
                    player.snake.direction = "south";
                break;
            default:
                return -1;
        }
        player.turnDone = true;
    }
    
    checkGameOver(snake){
        return ((typeof [].concat(...Object.values(this.players).map(obj => obj = obj.snake.body.slice(1))).find(cell => cell.x === snake.head.x && cell.y === snake.head.y) !== 'undefined')
                || (snake.isOutOfBounds(fieldWidth, fieldHeight)));
    }
    
    makeRandomGap(snake){
        if (Math.random() >= gapChance && snake.body.length > 1){
            snake.body.splice(1, 1);
        }
    }
    
    update(){
        this.clearField(0, 0, fieldWidth, fieldHeight);
        for (let player of Object.values(this.players)){
            player.turnDone = false;
            let snake = player.snake;
            if (player.out){
                snake.drawSnake(this);
                continue;
            }
            let changeX = 0;
            let changeY = 0;
            switch(snake.direction){
                case "north":
                    changeY = -elemHeightRoyale;
                    break;
                case "east":
                    changeX = elemWidthRoyale;
                    break;
                case "south":
                    changeY = elemHeightRoyale;
                    break;
                case "west":
                    changeX = -elemWidthRoyale;
                    break;
            }
            snake.insertNewHead(snake.head.x+changeX, snake.head.y+changeY);
            
            let playersLeft = this.getAlivePlayers();
            if (this.checkGameOver(snake)){
                player.out = true;
                player.place = playersLeft;
                this.sayFunc(this.channelObj.name, `/me ${player.name} is out! LuL `);
            }
            
            if (playersLeft <= 1){
                this.gameOver();
                return;
            }
            
            this.makeRandomGap(snake);
            snake.drawSnake(this);
        }
        
        this.sayFunc(this.channelObj.name, printField(this.context));
    }
    
    gameOver(){
        clearInterval(this.updateInterval);
        this.channelObj.gameRunning = false;
        let winner = Object.keys(this.players).find(id => this.players[id].place === 1);
        let reward = ushMaxRewardRoyale * (Object.keys(this.players).length/maxRoyalePlayers);
        this.sayFunc(this.channelObj.name, `/me The game is over! ${Object.values(this.players).map(obj => obj = `${obj.place}. ${obj.name}`).sort().join(" | ")}. \
        ${this.players[winner].name} has earned ${reward}USh!`);
        db.addUserPoints(winner, this.players[winner].name, reward);
        delete games[this.channelObj.name];
    }
}

class Cell{
    constructor(x, y, width, height, color){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }
    
    drawCell(gameObj){
        gameObj.drawRect(this.x, this.y, this.width, this.height, this.color);
    }
}

class Apple extends Cell{
    constructor(x, y, width, height, color, points){
        super(x, y, width, height, color);
        this.points = points;
    }
    
    hitApple(cellsArray, gameObj){
        let hitCell = cellsArray.find((cell) => cell.x === this.x && cell.y === this.y);
        if (typeof hitCell !== 'undefined'){
            gameObj.points += this.points;
            delete gameObj.apples[[hitCell.x, hitCell.y]];
            delete this;
            return true;
        } else {
            return false;
        }
    }
    
    drawCell(gameObj){
         gameObj.drawCircle(this.x+(elemWidth/2), this.y+(elemHeight/2), Math.floor(this.width/2), this.color);
    }
}

class Snake{
    constructor(color, width, height, startX = 0, startY = 0, direction = "east"){
        this.direction = direction;
        this.color = color;
        this.width = width;
        this.height = height;
        
        this.head = new Cell(startX, startY, this.width, this.height, this.color);
        this.body = [this.head];       
    }
    
    drawSnake(gameObj){
        for (const cell of this.body){
            cell.drawCell(gameObj);
        }
    }
    
    insertNewHead(x, y){
        let newHead = new Cell(x, y, this.width, this.height, this.color);
        this.head = newHead;
        this.body.unshift(newHead);
    }
    
    popTail(){
        delete this.body[this.body.length-1];
        this.body.pop();
    }
    
    isCellTaken(x, y){
        let cell = this.body.slice(1).find(elem => elem.x === x && elem.y === y);
        return (typeof cell !== 'undefined');
    }
    
    isOutOfBounds(x, y){
        return (this.head.x >= x || this.head.x < 0 
            || this.head.y >= y || this.head.y < 0);
    }
}

module.exports = {
    playSnake: function(channelObj, sayFunc, user, input){
        switch(input[1]){
            case undefined:
                if (input[0] !== channelObj.prefix+'snake')
                    break;
                let p = channelObj.prefix;
                sayFunc(channelObj.name, `/me Use ${p}snake start to see the available modes, the controls are w a s d. ${p}snake score too see your highscore :)`);
                break;
            case 'score':
                db.getHighScore(user['user-id'], 'snake').then((score) => {
                    sayFunc(channelObj.name, `/me ${user['username']}s highscore is: ${score}`);
                });
                break;
            case 'start':
                if (!games.hasOwnProperty(channelObj.name)){
                    switch(input[2]){
                        case 'chat':
                            games[channelObj.name] = new Game(channelObj, sayFunc, channelObj.name+'\'s chat', channelObj.id+String(channelObj.id), true);
                            break;
                        case 'royale':
                            games[channelObj.name] = new GameRoyale(channelObj, sayFunc, user['username'], user['user-id']);
                            sayFunc(channelObj.name, `/me A new round of Snake Royale has started! PogChamp Type ${channelObj.prefix}join to play! \
                            ${user['username']} is starting from the top left!`);
                            break;
                        case 'normal':
                            games[channelObj.name] = new Game(channelObj, sayFunc, user['username'], user['user-id']);
                            break;
                        default:
                            let p = channelObj.prefix;
                            sayFunc(channelObj.name, "/me Modes: "
                                    +p+"snake start normal - normal game for one player, "
                                    +p+"snake start chat - normal game where everyone in chat can give input, "
                                    +p+`snake start royale - a curve fever inspired game for up to ${maxRoyalePlayers} players.`);
                            return;
                    }
                    channelObj.gameRunning = true;
                    channelObj.game = module.exports.playSnake;
                }
                return;
        }
        if (games.hasOwnProperty(channelObj.name) && games[channelObj.name] instanceof GameRoyale) {
            if (games[channelObj.name].waitForJoin.status) {
                if (input[0] === channelObj.prefix + "join"){
                    games[channelObj.name].addPlayer(user['username'], user['user-id']);
                }
            } else {
                if (Object.keys(games[channelObj.name].players).includes(user['user-id'])){
                    games[channelObj.name].processInput(user['user-id'], input[0]);
                }
            }
            return;
        }
        
        if (!games.hasOwnProperty(channelObj.name) || (!games[channelObj.name].allMode && games[channelObj.name].player.name !== user['username'])){
            return;
        }
        games[channelObj.name].processInput(input[0]);
    }
};

function update(channel){
    let gameObj = games[channel];
    gameObj.turnDone = false;
    let changeX = 0;
    let changeY = 0;
    switch(gameObj.snake.direction){
        case "north":
            changeY = -elemHeight;
            break;
        case "east":
            changeX = elemWidth;
            break;
        case "south":
            changeY = elemHeight;
            break;
        case "west":
            changeX = -elemWidth;
            break;
    }

    gameObj.snake.insertNewHead(gameObj.snake.head.x+changeX, gameObj.snake.head.y+changeY);

    gameObj.clearField(0, 0, fieldWidth, fieldHeight);

    let found = false;
    for (let apple of Object.values(gameObj.apples)){
        if (apple.hitApple(gameObj.snake.body, gameObj)){
            found = true;
        } else {
            apple.drawCell(gameObj);
        }
    }

    if (!found)
        gameObj.snake.popTail();
    
    gameObj.manageApples();
     
    if (gameObj.checkGameOver()){
       gameOver(gameObj);
       return;
    }
    
    gameObj.snake.drawSnake(gameObj);
    gameObj.sayFunc(channel, printField(gameObj.context));
    
    if (gameObj.getFreeCell() === -1 && Object.values(gameObj.apples).length === 0){
        gameOver(gameObj, true);
    }
}

function printField(context){
    let pixelData = context.getImageData(0, 0, fieldWidth, fieldHeight).data;
    return braille.iterateOverPixels(pixelData, fieldWidth, 128, false);
}

async function gameOver(gameObj, won=false){
    if (!won) {
        gameObj.sayFunc(gameObj.channelObj.name, 
            `/me GAME OVER! ${gameObj.player.name} got ${gameObj.points} points and earned ${gameObj.points * ushReward}USh!`);
        await db.addUserPoints(gameObj.player.id, gameObj.player.name, gameObj.points*ushReward);
    } else {
        gameObj.sayFunc(gameObj.channelObj.name, 
            `/me Wow you actually won PogChamp ! ${gameObj.player.name} got ${gameObj.points} points and earned ${gameObj.points * ushReward}USh plus a ${winningBonus}USh winning bonus!`);
        await db.addUserPoints(gameObj.player.id, gameObj.player.name, ((gameObj.points*ushReward)+winningBonus));
    }
    db.setHighscoreIfHigh(gameObj.player.id, gameObj.player.name, gameObj.points, 'snake');
    clearInterval(gameObj.updateInterval);
    delete games[gameObj.channelObj.name];
    gameObj.channelObj.gameRunning = false;
}
