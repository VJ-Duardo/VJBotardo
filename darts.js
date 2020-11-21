const braille = require('./generatebraille.js');
const db = require('./database.js');
const { createCanvas, loadImage } = require('canvas');


const pixelWidth = 60;
const pixelHeight = 60;
const yCorrection = 0.158;

const bordImagePath = './assets/dart_board.png';
const handImagePath = './assets/dart_hand.png';

const maxRounds = 5;
const secondsToInput = 5;


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
        this.round = 0;
        this.canvas = createCanvas(pixelWidth, pixelHeight);
        this.context = this.canvas.getContext('2d');
    }
    
    async generateRandomPointAscii(){
        let _this = this;
        function loadAndAddToCanvas(url, x, y){
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
        await loadAndAddToCanvas(boardImagePath, 0, 0);
        
        const radius = (pixelWidth/2) * Math.sqrt(Math.random());
        const angle = Math.random() * 2 * Math.PI;
        const x = pixelWidth/2 + radius * Math.cos(angle);
        const y = (pixelHeight/2 + radius * Math.sin(angle)) - this.canvas.height * yCorrection;
        await loadAndAddToCanvas(handImagePath, x, y);
        sayFunc(this.channelObj.name, "Round " +this.round+ "/" +maxRounds+ " " +printField(this.context));
    }
}


module.exports = {
    playDarts: function(channelObj, sayFunc, user, input){
        
    }
};

function printField(context){
    let pixelData = context.getImageData(0, 0, pixelWidth, pixelHeight).data;
    return braille.iterateOverPixels(pixelData, pixelWidth, 128, false);
}