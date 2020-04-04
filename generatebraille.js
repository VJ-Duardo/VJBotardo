const { createCanvas, loadImage } = require('canvas');
const brailleData = require('./brailledata.js');


class Pixel {
    constructor(red, green, blue, alpha){
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }
    
    getAvg(){
        return (this.red + this.green + this.blue)/3;
    }
}

module.exports = {
    processImage: function(src, treshold=-1, height=60, width=60){
        console.log(src);
        if (typeof src === 'undefined'){
            return;
        }
        
        var canvas = createCanvas(width, height);
        var context = canvas.getContext('2d');

        return loadImage(src)
            .then((image) => {
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            let pixelData = context.getImageData(0, 0, canvas.width, canvas.height).data;
            return iterateOverPixels(pixelData, canvas.width, treshold);
        })
            .catch((error) => {
                console.log("An error occured!");
        });
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
    
    if (treshold === 150){
        return (pixel.red > treshold || pixel.green > treshold || pixel.blue > treshold);
    } else {
        return (pixel.getAvg() > treshold);
    }
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
    return [(avgColor/pixelAmount), 150][Math.floor(Math.random() * 2)];
}