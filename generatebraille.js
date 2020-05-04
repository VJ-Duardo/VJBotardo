const { createCanvas, loadImage } = require('canvas');
const brailleData = require('./brailledata.js');
const fetch = require("node-fetch");
var gifFrames = require('gif-frames');
var fs = require('fs');


class Pixel {
    constructor(red, green, blue, alpha){
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }
    
    getAvg(){
        return (this.red + this.green + this.blue + this.alpha)/4;
    }
}

module.exports = {
    processImage: function(src, treshold=-1, height=60, width=60, playGifs=false){
        console.log(src);
        if (typeof src === 'undefined'){
            return;
        }
        
        var canvas = createCanvas(width, height);
        var context = canvas.getContext('2d');
        
        
        if (!playGifs){
            return createStringFromImage(src);
        }
        
        function createStringFromImage(url, onlyReturnTransparencyData=false){
            console.log(url);
            return loadImage(url)
                .then((image) => {
                    context.clearRect(0, 0, width, height);
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);
                    let pixelData = context.getImageData(0, 0, canvas.width, canvas.height).data;
                    return iterateOverPixels(pixelData, canvas.width, treshold, onlyReturnTransparencyData);
                })
                .catch((error) => {
                    console.log(error+"An error occured! (image)");
                });
        }
        
        async function createStringFromGif(){
            let cumulativeVal = false;
            let transparencyPercent = await createStringFromImage(src, true);
            if (transparencyPercent < 10)
                cumulativeVal = true;
            return gifFrames({ url: src, frames: 'all', outputType: 'png', cumulative: cumulativeVal})
                .then(async function (frameData) {
                    let stringsArr = [];
                    let frameJump = frameData.length > 20 ? Math.ceil(frameData.length/20) : 1;
                    for (let i=0; i<frameData.length; i+=frameJump){
                        let prom = new Promise(function(resolve){
                            let stream = frameData[i].getImage().pipe(fs.createWriteStream('./frames/frame'+i+'.png'));
                            stream.on('finish', async function(){
                                let brailleString = await createStringFromImage('./frames/frame'+i+'.png');
                                stringsArr.push(brailleString);
                                resolve();
                            });
                        });
                        await prom;
                    }
                    return stringsArr;
                })
                .catch((error) => {
                    console.log(error+" An error occured! (gif)");
                });
        }
        
        
        if ((src.length - src.lastIndexOf('.')+1) <= 4){
            if (src.slice(src.length - 4) === '.gif'){
                return createStringFromGif();
            } else {
                return createStringFromImage(src);
            }
        } else {
            return fetch(src, {method:"HEAD"})
                .then(response => response.headers.get("Content-Type"))
                .then((type) => {
                    if (type === 'image/gif'){
                        return createStringFromGif();
                    } else {
                        return createStringFromImage(src);
                    }
            });
        }
    }
};

function iterateOverPixels(dataArray, width, treshold, onlyReturnTransparencyData){
    let resultArray = new Array();
    let pixelArray = new Array();
    for(i=0; i<dataArray.length; i+=4){
        pixelArray.push(new Pixel(dataArray[i], dataArray[i+1], dataArray[i+2], dataArray[i+3]));
    }
    
    if (onlyReturnTransparencyData){
        return getTransparencyPercent(pixelArray);
    }
    
    if (treshold === -1){
        treshold = getAverageColor(pixelArray);
        console.log(treshold);
    }
    
    for(i=0; i<pixelArray.length; i+=(width*4)){
        let line = "";
        for(j=0; j<width; j+=2){
            line += brailleData.braille_descr_dic[getBrailleCode(pixelArray, i+j, width, treshold)];
        }
        resultArray.push(line);
    }
    
    return resultArray.join(' ').replace(/[⠀]/g, '⠄');
}


function getBrailleCode(pixelArray, pos, width, treshold){
    let brailleCode = "";
    let pixelPosToBraillePos = {
        '00': '1',
        '01': '2',
        '02': '3',
        '03': '7',
        '10': '4',
        '11': '5',
        '12': '6',
        '13': '8'
    };
    for(k=0; k<2; k++){
        for(l=0; l<4; l++){
            if ((pos + k + (width*l)) < pixelArray.length){
                if (evaluatePixel(pixelArray[(pos + k + (width*l))], treshold)){
                    brailleCode += pixelPosToBraillePos[(k.toString() + l.toString())];
                }
            }
        }
    }
    return brailleCode.split("").map(Number).sort((a, b) => (a - b)).join('');
}


function evaluatePixel(pixel, treshold){
    if (pixel.alpha === 0){
        return true;
    }
    
    return (pixel.getAvg() > treshold);
}


function getTransparencyPercent(pixelArray){
    let transCount = 0;
    for (const pixel of pixelArray){
        if (pixel.alpha === 0){
            transCount++;
        }
    }
    return (transCount/pixelArray.length)*100;
}


function getAverageColor(pixelArray){
    let avgColor = 0;
    let pixelAmount = 0;
    for (const pixel of pixelArray){
        if (pixel.alpha !== 0){
            avgColor += pixel.getAvg();
            pixelAmount++;
        }
    }
    return (avgColor/pixelAmount);
}