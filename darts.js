const braille = require('./generatebraille.js');
const db = require('./database.js');
const { registerFont, createCanvas, loadImage } = require('canvas');
registerFont('./fonts/NotoSansJP-Regular.otf', { family: 'Noto Sans JP'});


const pixelWidth = 60;
const pixelHeight = 60;
const yCorrection = 0.158;
            
const boardImagePath = './assets/dart_board.png';
const handImagePath = './assets/dart_hand.png';
const brailleTreshold = 250;

const maxRounds = 5;
const secondsToInput = 10;
const timeToNextRound = 5000;

var games = {};


class Ring{
    constructor(start, end, points, message){
        this.start = start;
        this.end = end;
        this.points = points;
        this.message = message;
    }
    
    getPointsString(){
        return " You got " +this.points+ " points!";
    }
}
const rings = [
    new Ring(0, 3, 25, "PogChamp bullseye!"),
    new Ring(3, 8, 18, "SeemsGood Second ring, pretty good."),
    new Ring(8, 16, 10, ":/ Are you sure you read the rules? Only third ring."),
    new Ring(16, 23, 5, "FailFish Fourth ring, are you afk?"),
    new Ring(23, 30, 1, "NotLikeThis Fifth ring. Embarrassing."),
    new Ring(30, Number.POSITIVE_INFINITY, 0, "BibleThump You missed the board and hit my beautiful wall instead.")
];


class Player {
    constructor(id, name){
        this.id = id;
        this.name = name;
    }
}

class Game {
    constructor(channelObj, sayFunc, playerID, playerName){
        this.channelObj = channelObj;
        this.sayFunc = sayFunc;
        this.players = {};
        this.players[playerID] = new Player(playerID, playerName);
        this.currentPlayer = playerID;
        this.round = 1;
        this.points = 0;
        this.canvas = createCanvas(pixelWidth, pixelHeight);
        this.context = this.canvas.getContext('2d');
        this.waitForInput = {
            status: false,
            handle: null
        };
        this.hits = [];
        this.currentPoint = {
            x: 0,
            y: 0
        };
        this.generateRandomPointAscii = this.generateRandomPointAscii.bind(this);
        this.evaluateRound = this.evaluateRound.bind(this);
        this.sayFunc(this.channelObj.name, "/me Get ready...");
        let startRound = this.generateRandomPointAscii;
        setTimeout(function(){startRound();}, timeToNextRound);
    }
    
    async generateRandomPointAscii(){
        let _this = this;
        await loadAndAddToCanvas(boardImagePath, 0, 0, this.context);
        this.addPreviousHits(this.hits);
        
        const radius = (pixelWidth/2) * Math.sqrt(Math.random());
        const angle = Math.random() * 2 * Math.PI;
        const x = pixelWidth/2 + radius * Math.cos(angle);
        const y = (pixelHeight/2 + radius * Math.sin(angle));
        await loadAndAddToCanvas(handImagePath, x, y-(pixelHeight * yCorrection), this.context);
        this.currentPoint.x = x;
        this.currentPoint.y = y;
        this.sayFunc(this.channelObj.name, "/me Round " +this.round+ "/" +maxRounds+ " " +printField(this.context));
        this.sayFunc(this.channelObj.name, "/me Post your estimated points needed to move the dart arrow to the middle, your next input counts. You have "+secondsToInput+" seconds!");
        this.waitForInput.status = true;
        this.waitForInput.handle = setTimeout(function(){_this.evaluateRound("");}, secondsToInput*1000);
    }
    
    addPreviousHits(hits){
        const font = "8px Noto Sans JP";
        const align = "center";
        const yTextCorrection = 3;

        this.context.fillStyle = "black";
        this.context.font = font;
        this.context.textAlign = align;
        
        for(const hit of hits){
            if (hit.x < 0 || hit.x > pixelWidth || hit.y < 0 || hit.y > pixelHeight)
                continue;
            this.context.fillText('x', hit.x, hit.y+yTextCorrection);
        }
    }
    
    async evaluateRound(input){
        this.waitForInput.status = false;
        for (let chunk of input.split(" ")){
            let characters = chunk.split("");
            let optionIndex = characters.findIndex(char => ['l', 'r', 'u', 'd'].includes(char));
            if (optionIndex !== -1 && optionIndex !== 0 && !isNaN(parseInt(characters.slice(0, optionIndex).join('')))){
                let steps = parseInt(characters.slice(0, optionIndex).join(''));
                switch(chunk[optionIndex]){
                    case 'l':
                        this.currentPoint.x -= steps;
                        break;
                    case 'r':
                        this.currentPoint.x += steps;
                        break;
                    case 'u':
                        this.currentPoint.y -= steps;
                        break;
                    case 'd':
                        this.currentPoint.y += steps;
                        break;
                }
            }
        }
        
        this.hits.push({x: this.currentPoint.x, y: this.currentPoint.y});
        let distanceFromMiddle = Math.sqrt(((pixelWidth/2 - this.currentPoint.x) ** 2) + ((pixelHeight/2 - this.currentPoint.y) ** 2));
        let ring = rings.find(elem => distanceFromMiddle >= elem.start && distanceFromMiddle <= elem.end);
        this.points += ring.points;
        
        await loadAndAddToCanvas(boardImagePath, 0, 0, this.context);
        this.addPreviousHits([{x: this.currentPoint.x, y: this.currentPoint.y}]);
        this.sayFunc(this.channelObj.name, "/me "+ printField(this.context));
        
        this.sayFunc(this.channelObj.name, "/me " +ring.message + ring.getPointsString() + " Points overall: " +this.points);
        if (this.round === maxRounds){
            this.endGame();
        } else {
            this.round++;
            let _this = this;
            this.sayFunc(this.channelObj.name, "/me Get ready for the next round...");
            setTimeout(function(){_this.generateRandomPointAscii();}, timeToNextRound);
        }
    }
    
    endGame(){
        this.sayFunc(this.channelObj.name, "/me Game is over! You got " +this.points+ " points and earned " +this.points+ "USh :D");
        this.channelObj.gameRunning = false;
        db.addUserPoints(this.currentPlayer, this.players[this.currentPlayer].name, this.points);
        delete games[this.channelObj.name];
    }
}


module.exports = {
    playDarts: function(channelObj, sayFunc, user, input){
        if (!games.hasOwnProperty(channelObj.name)){
            games[channelObj.name] = new Game(channelObj, sayFunc, user['user-id'], user['username']);
            channelObj.gameRunning = true;
            channelObj.game = module.exports.playDarts;
            return;
        }
        
        let gameObj = games[channelObj.name];
        if (gameObj.waitForInput.status && user['user-id'] === gameObj.currentPlayer){
            clearTimeout(gameObj.waitForInput.handle);
            gameObj.evaluateRound(input.join(" "));
            gameObj.waitForInput.status = false;
        }
    }
};


function loadAndAddToCanvas(url, x, y, context){
    return loadImage(url)
        .then((image) => {
            context.drawImage(image, x, y, pixelWidth, pixelHeight);
            return 1;
        })
        .catch((err) => {
            console.log(err+" An error occured! (image)");
            return -1;
        });
}


function printField(context){
    let pixelData = context.getImageData(0, 0, pixelWidth, pixelHeight).data;
    return braille.iterateOverPixels(pixelData, pixelWidth, brailleTreshold, false);
}