const { createCanvas, loadImage } = require('canvas');
const brailleData = require('./brailledata.js');
const fetch = require("node-fetch");
var gifFrames = require('gif-frames');
var fs = require('fs');
const extractFrames = require('gif-extract-frames')


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

/*processImage: function(src, treshold=-1, height=60, width=60){
        console.log(src);
        if (typeof src === 'undefined'){
            return;
        }
        
        var canvas = createCanvas(width, height);
        var context = canvas.getContext('2d');
        
        function createStringFromImage(){
            return loadImage(src)
                .then((image) => {
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);
                    let pixelData = context.getImageData(0, 0, canvas.width, canvas.height).data;
                    return iterateOverPixels(pixelData, canvas.width, treshold);
                })
                .catch(() => {
                    console.log("An error occured! (image)");
                });
        }
        
        async function createStringFromGif(){
            return gifFrames({ url: './abc.gif', frames: 2, outputType: 'canvas' })
                .then(function (frameData) {
                    console.log(frameData);
                    let stringsArr = [];
                    //frameData.forEach(function(frame){
                        console.log(frameData[0].frameInfo);
                        let gifCanvas = frame.getImage();
                        console.log("gifCanvas");
                        gifCanvas.width = width;
                        gifCanvas.height = height;
                        console.log(gifCanvas);
                        let gifContext = gifCanvas.getContext('2d');
                        let gifPixelData = gifContext.getImageData(0, 0, gifCanvas.width, gifCanvas.height).data;
                        stringsArr.push(iterateOverPixels(gifPixelData, gifCanvas.width, treshold));
                    //});
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
                return createStringFromImage();
            }
        } else {
            return fetch(src, {method:"HEAD"})
                .then(response => response.headers.get("Content-Type"))
                .then((type) => {
                    if (type === 'image/gif'){
                        return createStringFromGif();
                    } else {
                        return createStringFromImage();
                    }
            });
        }
    }
};*/

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
            const results = await extractFrames({
                input: src,
                output: './frames/frame-%d.png'
            });
            
            return gifFrames({ url: src, frames: 'all', outputType: 'png', cumulative: true})
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

function iterateOverPixels(dataArray, width, treshold){
    let resultArray = new Array();
    let pixelArray = new Array();
    for(i=0; i<dataArray.length; i+=4){
        pixelArray.push(new Pixel(dataArray[i], dataArray[i+1], dataArray[i+2], dataArray[i+3]));
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