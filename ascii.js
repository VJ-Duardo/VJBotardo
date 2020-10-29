const braille = require('./generatebraille.js');
const emotes = require('./emotes.js');
const db = require('./database.js');
const { createCanvas, loadImage } = require('canvas');
const fetch = require("node-fetch");
var gifFrames = require('gif-frames');
var fs = require('fs');


const asciiModes = {
    ascii: {params: 1, func: plainAscii},
    mirror: {params: 1, func: mirror},
    antimirror: {params: 1, func: antimirror},
    stack: {params: 2, func: stack, mask: {width: 1, height: 1/6}},
    mix: {params: 2, func: mix, mask: {width: 1, height: 1/2}},
    merge: {params: 2, func: merge, mask: {width: 1/2, height: 1/3}}
};

const givenOptions = {
    '-w': {descr: "width"},
    '-h': {descr: "height"},
    '-t': {descr: "text"},
    '-r': {descr: "rotate"},
    '-d': {descr: "dither"},
    '-i': {descr: "invert"},
    '-tr': {descr: "treshold"}
};

const defaultWidth = 58;
const defaultHeight = 56;
const maxCharacters = 500;



async function getUrlByInput(channelObj, input){
    if (/((ftp|http|https):\/\/.+)|(\.\/frames\/.+)/.test(input)){
        return input;
    }
    
    let emote = [].concat.apply([], Object.values(channelObj.emotes).concat(Object.values(emotes.globalEmotes))).find(emote => emote.name === input);
    if (typeof emote === 'undefined'){
        emote = await db.getEmoteByName(input);
        if (emote === -1){
            emote = {url: emotes.getEmojiURL(input)};
        }
    }
    return emote.url;
}


function createOptionsObj(optionsInput){
    let optionsObj = {"width": defaultWidth, "height": defaultHeight};
    let optIndex = 0;
    
    optIndex = optionsInput.findIndex(str => str === '-t');
    if (optIndex !== -1 && optIndex+1 < optionsInput.length){
        optionsObj['text'] = optionsInput.slice(optIndex+1).join(" ");
        optionsInput = optionsInput.slice(0, optIndex);
    }
    if (optionsInput.length === 0)
        return optionsObj;
    
    for (let opt of ['-w', '-h', '-r', '-tr']){
        let optIndex = optionsInput.findIndex(str => str === opt);
        if (optIndex !== -1 && !isNaN(parseInt(optionsInput[optIndex+1]))){
            optionsObj[givenOptions[opt].descr] = parseInt(optionsInput[optIndex+1]);
        }
    }
    
    ['-d', '-i'].forEach(function(opt){
        if (optionsInput.includes(opt))
            optionsObj[givenOptions[opt].descr] = null;
    });
    
    return optionsObj;
}


function getTextObject(width, height, text){
    const relativeStartY = 0.83;
    const relativeStartX = 0.5;
    const relativeLineHeightPerMainHeight = 0.2;
    const relativeCharactersPerWidth = 0.2;
    const maxLines = 4;
    const charHeight = 4;
    
    const lineHeight = Math.ceil((height * relativeLineHeightPerMainHeight)/charHeight)*charHeight;
    const maxCharsPerLine = Math.ceil(width * relativeCharactersPerWidth);
    
    let textObj = {
        'height': lineHeight,
        'width': width,
        'y': lineHeight * relativeStartY,
        'x': width * relativeStartX
    };
    
    let lines = new Array(maxLines).fill("");
    let currentLine = 0;
    for (let word of text.split(" ")){
        if ((lines[currentLine].length/2)-1 + word.length <= maxCharsPerLine){
            lines[currentLine] += " "+word.split("").join(" ")+"  ";
        } else {
            if (word.length <= maxCharsPerLine && currentLine < lines.length-1){
                currentLine++;
                lines[currentLine] += " "+word.split("").join(" ")+"  ";
            }
        }
    }
    textObj['textLines'] = lines.filter(line => line !== "");
    textObj['heightAll'] = lineHeight * textObj['textLines'].length;
    
    return textObj;
}



async function printAscii(channelObj, sayFunc, mode, userInput, gifSpam){
    if (userInput.length < asciiModes[mode].params){
        sayFunc(channelObj.name, "/me Parameter(s) are missing :Z Available extra options: -w, -h, -r, -d, -i, -tr, -t Check commands list for more info.");
        return;
    }
    
    if (mode === 'ascii' && userInput[0] === '-t'){
        let textObject = getTextObject(defaultWidth, defaultHeight, userInput.slice(1, userInput.length).join(" "));
        if (textObject['heightAll'] < 1){
            sayFunc(channelObj.name, "/me The given text is too long!");
        } else {
            sayFunc(channelObj.name, generateTextAscii(getTextObject(defaultWidth, defaultHeight, userInput.slice(1, userInput.length).join(" "))));
        }
        return;
    }
    
    let urls = [];
    for (let input of userInput.slice(0, asciiModes[mode].params)){
        urls.push(await getUrlByInput(channelObj, input));
        userInput.shift();
    }
    let brailleString = await ascii(mode, urls, gifSpam, userInput, channelObj, sayFunc);
    if (brailleString !== -1){
        sayFunc(channelObj.name, brailleString);
    } else {
        sayFunc(channelObj.name, "/me Cant find emote in this channel or invalid link :Z If you added a new emote, do "+channelObj.prefix+"reload");
    }
    return;
}



async function ascii(mode, urls, gifSpam, asciiOptions, channelObj, sayFunc){
    let options = createOptionsObj(asciiOptions);
    console.log(options);
    let characters = (Math.ceil(options['width']/2) * Math.ceil(options['height']/4) + Math.ceil(options['height']/4));
    if (characters <= 0 || characters > maxCharacters){
        return "/me Please pick valid dimensions (max 500 characters)";
    }
    let textObject = null;
    if (options.hasOwnProperty('text')){
        textObject = getTextObject(options['width'], options['height'], options['text']);
        options['height'] -= textObject['heightAll'];
    }
    
    let canvas = createCanvas(options['width'], options['height']);
    let context = canvas.getContext('2d');
    if (options.hasOwnProperty('rotate'))
        rotateContext(context, options['rotate'], options['width'], options['height']);
    
    if (mode === 'ascii' && gifSpam && await gifCheck(...urls)){
        context = await printGifAscii(channelObj, sayFunc, asciiOptions, ...urls);
        return "";
    } else {
        context = await asciiModes[mode].func(options['width'], options['height'], context, ...urls);
    }
    
    if (context === -1){
        return -1;
    }
    
    let brailleText = textObject !== null && textObject['textLines'].length > 0 ? generateTextAscii(textObject) : "";
    let treshold = options.hasOwnProperty('treshold') ? options['treshold'] : -1;
    let brailleResult =  braille.iterateOverPixels(context.getImageData(0, 0, options['width'], options['height']).data, options['width'], treshold, false, options.hasOwnProperty('dither'), asciiModes[mode].mask)
            + " " 
            + brailleText;
    return options.hasOwnProperty('invert') ? braille.invert(brailleResult) : brailleResult;
}






async function addPicsToContext(context, srcList, size){
    function createStringFromImage(url, x, y){
        return loadImage(url)
            .then((image) => {
                context.drawImage(image, x, y, size.width, size.height);
                return 1;
            })
            .catch((err) => {
                console.log(err+" An error occured! (image)");
                return -1;
            });
    }
    
    for (let src of srcList){
        let status = await createStringFromImage(src.url, src.x, src.y);
        if (status === -1)
            return status;
    }
    return context;
}


async function plainAscii(width, height, context, srcLeft, srcRight){
    return await addPicsToContext(context, 
        [{url: srcLeft, x: 0, y: 0}],
        {width: width, height: height});
}


async function merge(width, height, context, srcLeft, srcRight){
    return await addPicsToContext(context, 
        [{url: srcLeft, x: 0, y: 0},
        {url: srcRight, x: width/2, y: 0}],
        {width: width/2, height: height});
}



async function stack(width, height, context, srcTop, srcBottom){
    return await addPicsToContext(context, 
        [{url: srcTop, x: 0, y: 0},
        {url: srcBottom, x: 0, y: height/2}],
        {width: width, height: height/2});
}


async function mix(width, height, context, srcTop, srcBottom){
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(width, 0);
    context.lineTo(width, height/2);
    context.lineTo(0, height/2);
    context.closePath();
    context.save();
    context.clip();
    context = await addPicsToContext(context,
        [{url: srcTop, x: 0, y: 0}],
        {width: width, height: height});
    if (context === -1)
        return context;
    
    context.restore();
    context.beginPath();
    context.moveTo(0, height/2);
    context.lineTo(width, height/2);
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();
    context.clip();
    return await addPicsToContext(context,
        [{url: srcBottom, x: 0, y: 0}],
        {width: width, height: height});
}


async function mirrorFunctions(width, height, context, src, clipReg){
    context.beginPath();
    context.moveTo(clipReg[0].x, clipReg[0].y);
    context.lineTo(clipReg[1].x, clipReg[1].y);
    context.lineTo(clipReg[2].x, clipReg[2].y);
    context.lineTo(clipReg[3].x, clipReg[3].y);
    context.closePath();
    context.save();
    context.clip();
    context = await addPicsToContext(context,
        [{url: src, x: 0, y: 0}],
        {width: width, height: height});
    if (context === -1)
        return context;
    
    context.restore();
    context.translate(width/2, 0);
    context.scale(-1, 1);
    context.translate(-width/2, 0);
    context.beginPath();
    context.moveTo(clipReg[0].x, clipReg[0].y);
    context.lineTo(clipReg[1].x, clipReg[1].y);
    context.lineTo(clipReg[2].x, clipReg[2].y);
    context.lineTo(clipReg[3].x, clipReg[3].y);
    context.closePath();
    context.clip();
    return await addPicsToContext(context,
        [{url: src, x: 0, y: 0}],
        {width: width, height: height});
}


async function mirror(width, height, context, src){
    return await mirrorFunctions(width, height, context, src, [
        {x: 0, y: 0}, {x: width/2, y: 0}, {x: width/2, y: height}, {x: 0, y: height}
    ]);
}


async function antimirror(width, height, context, src){
    return await mirrorFunctions(width, height, context, src, [
        {x: width/2, y: 0}, {x: width, y: 0}, {x: width, y: height}, {x: width/2, y: height}
    ]);
}



function rotateContext(context, degree, width, height){
    let angle = degree * Math.PI / 180;
    context.translate(width/2, height/2);
    context.rotate(angle);
    context.translate(-width/2, -height/2);
}



function generateTextAscii(textObj){
    //console.log(textObj);
    const font = "100 11px Corbel";
    const align = "center";
    const treshold = 128;
    
    let canvas = createCanvas(textObj['width'], textObj['height']);;
    
    let context = canvas.getContext('2d');
    context.fillStyle = "black";
    context.font = font;
    context.textAlign = align;
    let textAscii = "";
    
    for (let line of textObj['textLines']){
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillText(line, textObj['x'], textObj['y'], canvas.width);
        textAscii += braille.iterateOverPixels(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, treshold, false) + " ";
    }
    
    return textAscii;
}






async function printGifAscii(channelObj, sayFunc, asciiOptions, src){
    let cumulativeVal = false;
    let transparencyPercent = await braille.getTransparencyData(src);
    cumulativeVal = transparencyPercent < 10;
    return gifFrames({ url: src, frames: 'all', outputType: 'png', cumulative: cumulativeVal})
        .then(async function (frameData) {
            let frameJump = frameData.length > 20 ? Math.ceil(frameData.length/20) : 1;
            for (let i=0; i<frameData.length; i+=frameJump){
                let prom = new Promise(function(resolve){
                    let stream = frameData[i].getImage().pipe(fs.createWriteStream('./frames/frame'+i+'.png'));
                    stream.on('finish', async function(){
                        await printAscii(channelObj, sayFunc, 'ascii', ['./frames/frame'+i+'.png'].concat(asciiOptions), false);
                        resolve();
                    });
                });
                await prom;
            }
        })
        .catch((error) => {
            sayFunc(channelObj.name, "/me Cant find emote in this channel or invalid link :Z If you added a new emote, do reload");
            console.log(error+" An error occured! (gif)");
        });
}


function gifCheck(src){
    return fetch(src, {method:"HEAD"})
        .then(response => response.headers.get("Content-Type"))
        .then((type) => {
            return (type === 'image/gif');
    });
}



async function randomAscii(channelObj, sayFunc, userInput){
    let keyword = typeof userInput[0] !== 'undefined' 
            && userInput[0].charAt(0) === '-' ? '' : userInput[0];
    if (userInput.includes("-supersecretbanderoption")){
        let count = await db.getRandomEmoteStat(keyword);
        sayFunc(channelObj.name, "/me Found " +count+ " emotes containing that keyword SeemsGood");
        return;
    }
    
    let emote = await db.getRandomEmote(keyword);
    if (emote === -1){
        sayFunc(channelObj.name, "/me Could not find a matching emote :(");
    } else {
        ascii("ascii", [emote.url], false, userInput, null, null)
            .then((brailleString) => {
                if (brailleString === -1){
                    sayFunc(channelObj.name, "/me Something went wrong :(");
                } else {
                     sayFunc(channelObj.name, emote.name +" "+brailleString);   
                }
        });
    }
}

module.exports = {
    randomAscii: randomAscii,
    printAscii: printAscii,
    ascii: ascii
};