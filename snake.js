const braille = require('./generatebraille.js');
const db = require('./database.js');
const { createCanvas, loadImage } = require('canvas');

const fieldWidth = 60;
const fieldHeight = 64;
        
const elemWidth = 6;
const elemHeight = 8;

const refreshRate = 1000;

const appleChance = 0.5;
const appleMax = 2;
const applePoints = 1;

const ushReward = 10;

var games = {};


class Game {
    constructor(channelObj, sayFunc, playerName, playerID){
        this.channelObj = channelObj;
        this.sayFunc = sayFunc;
        this.player = {
            name: playerName,
            id: playerID
        };
        this.points = 0;
        this.apples = {};
        this.snake = new Snake("black");
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
        
        setApple(this.snake, this.apples);
        function setApple(snake, apples){
            let x = (Math.floor(Math.random() * (fieldWidth/elemWidth))*elemWidth);
            let y = (Math.floor(Math.random() * (fieldHeight/elemHeight))*elemHeight);

            if ((!snake.isCellTaken(x, y)) 
                    && snake.head.x !== x && snake.head.y !== y
                    && !apples.hasOwnProperty([x, y])){
                apples[[x, y]] = (new Apple(x, y, elemWidth, elemHeight, "black", applePoints));
            } else {
                setApple(snake, apples);
            }
        }
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
    constructor(color){
        this.direction = "east";
        this.color = color;
        
        this.head = new Cell(0, 0, elemWidth, elemHeight, this.color);
        this.body = [this.head];       
    }
    
    drawSnake(gameObj){
        for (const cell of this.body){
            cell.drawCell(gameObj);
        }
    }
    
    insertNewHead(x, y){
        let newHead = new Cell(x, y, elemWidth, elemHeight, this.color);
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
                sayFunc(channelObj.name, '/me Use '+p+'snake start to start a game, the controls are w a s d. '+p+'snake score for your score and '+p+'snake top for the current top 10 :)');
                break;
            case 'top':
                db.getTopUserScores(10, 'snake').then((topString) => {
                    sayFunc(channelObj.name, '/me ' + topString);
                });
                break;
            case 'score':
                db.getSnakeScore(user['user-id']).then((score) => {
                    sayFunc(channelObj.name, '/me ' +user['username']+'s highscore is: ' +score);
                });
                break;
            case 'start':
                if (!games.hasOwnProperty(channelObj.name)){
                    games[channelObj.name] = new Game(channelObj, sayFunc, user['username'], user['user-id']);
                    channelObj.gameRunning = true;
                    channelObj.game = module.exports.playSnake;
                }
                return;
        }
        
        if (!games.hasOwnProperty(channelObj.name) || games[channelObj.name].player.name !== user['username']){
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
    gameObj.manageApples();

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
     
    if (gameObj.checkGameOver()){
       gameOver(gameObj);
       return;
    }
    
    gameObj.snake.drawSnake(gameObj);
    gameObj.sayFunc(channel, printField(gameObj.context));
}


function printField(context){
    let pixelData = context.getImageData(0, 0, fieldWidth, fieldHeight).data;
    return braille.iterateOverPixels(pixelData, fieldWidth, 128, false);
}

function gameOver(gameObj){
    gameObj.sayFunc(gameObj.channelObj.name, 
        "/me GAME OVER! " + gameObj.player.name + " got " + gameObj.points + " points and earned " + gameObj.points*ushReward + "USh!");
    db.setHighscoreIfHigh(gameObj.player.id, gameObj.player.name, gameObj.points);
    db.addUserPoints(gameObj.player.id, gameObj.player.name, gameObj.points*ushReward);
    clearInterval(gameObj.updateInterval);
    delete games[gameObj.channelObj.name];
    gameObj.channelObj.gameRunning = false;
}