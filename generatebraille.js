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
    
    getAvgRGB(){
        return (this.red + this.green + this.blue)/3;
    }
    
    setRGB(r, g, b) {
        this.red = r;
        this.green = g;
        this.blue = b;
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
        
        function createStringFromImage(url){
            console.log(url);
            return loadImage(url)
                .then((image) => {
                    context.clearRect(0, 0, width, height);
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);
                    let pixelData = context.getImageData(0, 0, canvas.width, canvas.height).data;
                    return iterateOverPixels(pixelData, canvas.width, treshold);
                })
                .catch((error) => {
                    console.log(error+"An error occured! (image)");
                });
        }
        
        async function createStringFromGif(){
            let cumulativeVal = false;
            let transparencyPercent = await getTransparencyData(src);
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
    },
    mirror: mirror,
    invert: invert,
    iterateOverPixels: iterateOverPixels,
    getTransparencyData: getTransparencyData
};

function iterateOverPixels(dataArray, width, treshold, onlyReturnTransparencyData, useDithering){
    let resultArray = new Array();
    let pixelArray = new Array();
    for(i=0; i<dataArray.length; i+=4){
        pixelArray.push(new Pixel(dataArray[i], dataArray[i+1], dataArray[i+2], dataArray[i+3]));
    }
    
    if (onlyReturnTransparencyData){
        return getTransparencyPercent(pixelArray);
    }
    
    if (useDithering){
        treshold = 128;
        pixelArray = floydSteinberg(pixelArray, width);
    }
    
    if (treshold === -1){
        treshold = getAverageColor(pixelArray, width);
    } else {
        treshold = new Array(pixelArray.length).fill(treshold);
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


function getTransparencyData(url){
    const width = 60;
    const height = 60;
    var canvas = createCanvas(width, height);
    var context = canvas.getContext('2d');
    
    return loadImage(url)
        .then((image) => {
            context.clearRect(0, 0, width, height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            let pixelData = context.getImageData(0, 0, canvas.width, canvas.height).data;
            return iterateOverPixels(pixelData, canvas.width, 0, true);
        })
        .catch((error) => {
            console.log(error+"An error occured! (image)");
        });
}


function floydSteinberg(pixelArray, width){
   for (i=0; i<pixelArray.length; i++){      
        quantError = [pixelArray[i].red, pixelArray[i].green, pixelArray[i].blue];
        
        if ((0.8*pixelArray[i].red + 0.1*pixelArray[i].green + 0.1*pixelArray[i].blue) > 128){
           quantError.forEach((_, index, array) => array[index] -= 255);
           pixelArray[i].setRGB(255, 255, 255);
        } else {
           pixelArray[i].setRGB(0, 0, 0);
        }
       
        let neighbours = [[1,0,7], [-1,1,3], [0,1,5], [1,1,1]];
        for (const n of neighbours){
            if ((i+(n[1]*width))+n[0] < pixelArray.length && (i % width)+n[0] >= 0 && (i % width)+n[0] < width){
                let pixelIndex = i+(n[1]*width)+n[0];
                let newColors = new Array(3);
                quantError.forEach((elem, index) => newColors[index] = Object.values(pixelArray[pixelIndex])[index] + elem * n[2] /16);
                pixelArray[pixelIndex].setRGB(newColors[0], newColors[1], newColors[2]);
            }
        }
   }
   return pixelArray;
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
                if (evaluatePixel(pixelArray[(pos + k + (width*l))], (pos + k + (width*l)), treshold)){
                    brailleCode += pixelPosToBraillePos[(k.toString() + l.toString())];
                }
            }
        }
    }
    return brailleCode.split("").map(Number).sort((a, b) => (a - b)).join('');
}


function evaluatePixel(pixel, pos, treshold){
    return ((pixel.alpha === 0) || (pixel.getAvg() > treshold[pos]));
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


function getAverageColor(pixelArray, width){
    let tresholdsObj = {};
    let maskWidth = width;
    maskWidth = maskWidth > width ? width : maskWidth;
    maskWidth = maskWidth < 1 ? 1 : maskWidth;
    let maskHeight = Math.round((pixelArray.length/width)/3);
    maskHeight = maskHeight > Math.ceil(pixelArray.length/width) ? Math.ceil(pixelArray.length/width) : maskHeight;
    maskHeight = maskHeight < 1 ? 1 : maskHeight;
    
    let x = 0;
    let y = 0;
    while (y < Math.ceil(pixelArray.length/width)){
        let avgColor = 0;
        let pixelAmount = 0;
        let indexes = [];
        for (let j = y; j < (y+(maskHeight)); j++){
            for (let k = x; k < (x+maskWidth); k++){
                let index = (k + (width*j));
                if (index < pixelArray.length){
                    if (setPixelCheck(pixelArray[index])) {
                        tresholdsObj[index] = 245;
                        continue;
                    }
                    avgColor += pixelArray[index].getAvg();
                    tresholdsObj[index] = 128;
                    pixelAmount++;
                    indexes.push(index);
                }
            }
        }
        avgColor = avgColor/pixelAmount;
        for (const index of indexes){
            tresholdsObj[index] = avgColor;
        }
        
        if ((x + maskWidth) >= width){
            x = 0;
            y += maskHeight;
        } else {
            x += maskWidth;
        }
    }
    return tresholdsObj;
}

function setPixelCheck(pixel){
    return (pixel.alpha === 0) || (pixel.getAvg() > 245);
}

function mirror(inputStr){
    let lineArr = inputStr.split(/[ \n]/).filter(Boolean);
    let resultsArr = new Array(lineArr.length).fill('');
    for (i = 0; i < lineArr.length; i++) {
        for (j = lineArr[i].length - 1; j >= 0; j--) {
            if (typeof brailleData.mirroredDic[lineArr[i][j]] !== 'undefined') {
                esultsArr[i] += brailleData.mirroredDic[lineArr[i][j]];
            } else {
                resultsArr[i] += lineArr[i][j];
            }
        }
    }
    return resultsArr.join(' ').replace(/[⠀]/g, '⠄');
}

function invert(inputStr) {
    let resultStr = "";
    for (i = 0; i < inputStr.length; i++) {
        if (typeof  brailleData.invertedDic[inputStr[i]] !== 'undefined') {
            resultStr += brailleData.invertedDic[inputStr[i]];
        } else {
            resultStr += inputStr[i];
        }
    }
    return resultStr;
}