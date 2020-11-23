const braille = require('./generatebraille.js');
const db = require('./database.js');
const { createCanvas, loadImage } = require('canvas');


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
    new Ring(0, 3, 3, "PogChamp bullseye!"),
    new Ring(3, 8, 18, "SeemsGood Second ring, pretty good."),
    new Ring(8, 16, 10, ":/ Are you sure you read the rules?"),
    new Ring(16, 23, 5, "FailFish Are you afk?"),
    new Ring(23, 30, 1, "NotLikeThis Embarrassing."),
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
            handle: null,
        };
        this.currentPoint = {
            x: 0,
            y: 0
        };
        this.generateRandomPointAscii = this.generateRandomPointAscii.bind(this);
        this.sayFunc(this.channelObj.name, "Get ready...");
        let startRound = this.generateRandomPointAscii;
        setTimeout(function(){startRound();}, timeToNextRound);
    }
    
    async generateRandomPointAscii(){
        let _this = this;
        function loadAndAddToCanvas(url, x, y){
            return loadImage(url)
                .then((image) => {
                    _this.context.drawImage(image, x, y, pixelWidth, pixelHeight);
                    return 1;
                })
                .catch((err) => {
                    console.log(err+" An error occured! (image)");
                    return -1;
                });
        }
        await loadAndAddToCanvas(boardImagePath, 0, 0);
        
        const radius = (pixelWidth/2) * Math.sqrt(Math.random());
        const angle = Math.random() * 2 * Math.PI;
        const x = pixelWidth/2 + radius * Math.cos(angle);
        const y = (pixelHeight/2 + radius * Math.sin(angle)) - this.canvas.height * yCorrection;
        await loadAndAddToCanvas(handImagePath, x, y);
        this.currentPoint.x = x;
        this.currentPoint.y = y;
        this.sayFunc(this.channelObj.name, "Round " +this.round+ "/" +maxRounds+ " " +printField(this.context));
        this.sayFunc(this.channelObj.name, "/me Post your estimated points needed to move the dart arrow to the middle, your next input counts. You have "+secondsToInput+" seconds!");
        this.waitForInput.status = true;
        this.waitForInput.handle = setTimeout(function(){_this.evaluateRound("");}, secondsToInput*1000);
    }
    
    evaluateRound(input){
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
        
        let distanceFromMiddle = Math.sqrt(((pixelWidth - this.currentPoint.x)^2) + ((pixelHeight - this.currentPoint.y)^2));
        let ring = rings.find(elem => distanceFromMiddle >= elem.start && distanceFromMiddle <= elem.end);
        this.points += ring.points;
        this.sayFunc(this.channelObj.name, "/me " +ring.message + ring.getPointsString() + " Points overall: " +this.points);
        this.round++;
        if (this.round === maxRounds){
            this.endGame();
        } else {
            let _this = this;
            this.sayFunc(this.channelObj.name, "/me Get ready for the next round...");
            setTimeout(function(){_this.generateRandomPointAscii();}, timeToNextRound);
        }
    }
    
    endGame(){
        this.sayFunc(this.channelObj.name, "/me Game is over! You got " +this.points+ " points and earned " +this.points+ "USh :D");
        this.channelObj.gameRunning = false;
        db.addUserPoints(winner, winner.name, reward);
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
            gameObj.evaluateRound(input.join(" "));
            clearTimeout(gameObj.waitForInput.handle);
            gameObj.waitForInput.status = false;
        }
    }
};

function printField(context){
    let pixelData = context.getImageData(0, 0, pixelWidth, pixelHeight).data;
    return braille.iterateOverPixels(pixelData, pixelWidth, brailleTreshold, false);
}