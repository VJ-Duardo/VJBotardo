const braille = require('./generatebraille.js');
const emotes = require('./emotes.js');
const db = require('./database.js');
const { createCanvas, loadImage } = require('canvas');
const fetch = require("node-fetch");
var gifFrames = require('gif-frames');
var fs = require('fs');


const asciiModes = {
    ascii: {params: 1, func: getAsciiContext}
    /*mirror: {params: 1, func: mirror},
    antimirror: {params: 1, func: antimirror},
    stack: {params: 2, func: stack},
    mix: {params: 2, func: mix},
    merge: {params: 2, func: merge},*/
};

const givenOptions = {
    '-w': {descr: "width"},
    '-h': {descr: "height"},
    '-t': {descr: "text"},
    '-r': {descr: "rotate"},
    '-d': {descr: "dither"},
    '-i': {descr: "invert"}
};

const defaultWidth = 58;
const defaultHeight = 56;
const maxCharacters = 500;



async function getUrlByInput(channelObj, input){
    if (/(ftp|http|https):\/\/.+/.test(input)){
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
    
    for (let opt of ['-w', '-h', '-r']){
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
    
    const lineHeight = Math.round((height * relativeLineHeightPerMainHeight)/charHeight)*charHeight;
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
        if (lines[currentLine].length + word.length <= maxCharsPerLine){
            lines[currentLine] += " "+word.split("").join(" ")+" ";
        } else {
            if (word.length <= maxCharsPerLine && currentLine < lines.length-1){
                currentLine++;
                lines[currentLine] += " "+word.split("").join(" ")+" ";
            }
        }
    }
    textObj['textLines'] = lines.filter(line => line !== "");
    textObj['heightAll'] = lineHeight * textObj['textLines'].length;
    
    return textObj;
}


async function printAscii(channelObj, sayFunc, mode, userInput, gifSpam){
    let urls = [];
    for (let input of userInput.slice(0, asciiModes[mode].params)){
        urls.push(await getUrlByInput(channelObj, input));
        userInput.shift();
    }
    sayFunc(channelObj.name, await ascii(mode, urls, gifSpam, userInput));
}



async function ascii(mode, urls, gifSpam, asciiOptions){
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
    
    await asciiModes[mode].func(options['width'], options['height'], context, urls[0], false);
    
    if (context === -1){
        return "/me Cant find emote in this channel or invalid link :Z If you added a new emote, do reload";
    }
    
    let brailleText = textObject !== null && textObject['textLines'].length > 0 ? generateTextAscii(textObject) : "";
    let brailleResult =  braille.iterateOverPixels(context.getImageData(0, 0, options['width'], options['height']).data, options['width'], -1, false, options.hasOwnProperty('dither'));
            + " " 
            + brailleText;
    return options.hasOwnProperty('invert') ? braille.invert(brailleResult) : brailleResult;
}



function generateTextAscii(textObj){
    console.log(textObj);
    const font = "11px Corbel";
    const align = "center";
    const treshold = 128;
    
    let canvas = createCanvas(textObj['width'], textObj['height']);;
    console.log(canvas);
    
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


function rotateContext(context, degree, width, height){
    let angle = degree * Math.PI / 180;
    context.translate(width/2, height/2);
    context.rotate(angle);
    context.translate(-width/2, -height/2);
}


function getAsciiContext(width, height, context, src, gifSpam){
    if (!gifSpam){
        return createStringFromImage(src);
    }
        
    function createStringFromImage(url){
        console.log(url);
        return loadImage(url)
            .then((image) => {
                context.drawImage(image, 0, 0, width, height);
                return context;
                //let pixelData = context.getImageData(0, 0, canvas.width, canvas.height).data;
                //return braille.iterateOverPixels(pixelData, canvas.width, treshold);
            })
            .catch((error) => {
                console.log(error+"An error occured! (image)");
                return -1;
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



async function singleEmoteAsciis(channelObj, sayFunc, mode, userInput, gifSpam){
    function callProcessImage(url){
        let width = mode === 'ascii' ? 58 : 56;
        braille.processImage(url, -1, 56, width, (mode === 'ascii' && gifSpam))
            .then((brailleString) => {
                if (typeof brailleString === 'undefined'){
                    sayFunc(channelObj.name, "/me Cant find emote in this channel or invalid link :Z If you added a new emote, do "+channelObj.prefix+"reload");
                } else {
                    if (mode === 'ascii'){
                        if (Array.isArray(brailleString)){
                            brailleString.forEach(function(brailleFrame){
                                sayFunc(channelObj.name, brailleFrame);
                            });
                        } else {
                            sayFunc(channelObj.name, brailleString);
                        }
                    } else {
                        let brailleLines = brailleString.split(" ");
                        
                        brailleLines = brailleLines.map(function(line){
                            let halfLine = mode === 'mirror' ? line.slice(0, Math.floor(line.length/2)) : braille.mirror(line.slice(Math.floor(line.length/2)));
                            return halfLine + braille.mirror(halfLine);
                        });
                        
                        sayFunc(channelObj.name, brailleLines.join(' '));
                    }
                }
            })
            .catch((error) => {
                console.error(error);
                sayFunc(channelObj.name, "/me That did not work :(");
            });
    }
    if (typeof userInput === 'undefined'){
        let p = channelObj.prefix;
        sayFunc(channelObj.name, "/me Correct syntax: "+p+"ascii/"+p+"mirror/"+p+"antimirror <emote>|<link>|<emoji>. For more detailed options use: https://vj-duardo.github.io/Braille-Art/");
        return;
    }
    
    if (/(ftp|http|https):\/\/.+/.test(userInput)){
        callProcessImage(userInput);
        return;
    }
    
    let emote = [].concat.apply([], Object.values(channelObj.emotes).concat(Object.values(emotes.globalEmotes))).find(emote => emote.name === userInput);
    if (typeof emote === 'undefined'){
        emote = await db.getEmoteByName(userInput);
        if (emote === -1){
            emote = {url: emotes.getEmojiURL(userInput)};
        }
    }
    callProcessImage(emote.url);
}


async function twoEmoteAsciis(channelObj, sayFunc, mode, inputLeft, inputRight){
    let resultArray = [];
    function callProcessImage(url, treshold = -1){
        let width = mode === 'merge' ? 28 : 58;
        let height = mode === 'stack' ? 28 : 56;
        return braille.processImage(url, treshold, height, width)
            .then((brailleString) => {
                if (typeof brailleString === 'undefined'){
                    sayFunc(channelObj.name, "/me Cant find emote in this channel or invalid link :Z");
                    return -1;
                } else {
                    switch(mode){
                        case 'merge':
                            if (resultArray.length <= 1){
                                resultArray = new Array(15).fill('')
                            }
                            brailleString.split(' ').forEach(function(line, i){
                               resultArray[i] += line;
                            });
                            break;
                        case 'stack':
                            brailleString.split(' ').forEach(function(line){
                                resultArray.push(line);
                            });
                            break;
                        case 'mix':
                            let brailleLinesArray = brailleString.split(' ');
                            if (resultArray.length <= 1){
                                brailleLinesArray = brailleLinesArray.slice(0, Math.floor((height/4)/2));
                            } else {
                                brailleLinesArray = brailleLinesArray.slice(Math.floor((height/4)/2));
                            }
                            
                            brailleLinesArray.forEach(function(line){
                                resultArray.push(line);
                            });
                            break;
                    }
                    return 0;
                }
            })
            .catch(() => {
                sayFunc(channelObj.name, "/me That did not work :(");
                return -1;
            });;
    }
    
    if (typeof inputLeft === 'undefined' || typeof inputRight === 'undefined'){
        let p = channelObj.prefix;
        sayFunc(channelObj.name, "/me Correct syntax: "+p+"merge/"+p+"stack/"+p+"mix <emote>|<link>|<emoji> <emote>|<link>|<emoji>. For more detailed options use: https://vj-duardo.github.io/Braille-Art/");
        return;
    }
    
    for (let input of [inputLeft, inputRight]){
        if (/(ftp|http|https):\/\/.+/.test(input)){
            await callProcessImage(input);
            continue;
        }
        
        let emote = [].concat.apply([], Object.values(channelObj.emotes).concat(Object.values(emotes.globalEmotes))).find(emote => emote.name === input);
        if (typeof emote === 'undefined'){
            emote = await db.getEmoteByName(input);
            if (emote === -1){
                emote = {url: emotes.getEmojiURL(input)};
            }
        }
        let processImageResult = await callProcessImage(emote.url);
        if (processImageResult === -1)
            return;
        
    }
    sayFunc(channelObj.name, resultArray.join(' '));
}


async function randomAscii(channelObj, sayFunc, keyword, option){
    if (option === "-supersecretbanderoption"){
        let count = await db.getRandomEmoteStat(keyword);
        sayFunc(channelObj.name, "/me Found " +count+ " emotes containing that keyword SeemsGood");
        return;
    }
    
    let emote = await db.getRandomEmote(keyword);
    if (emote === -1){
        sayFunc(channelObj.name, "/me Could not find a matching emote :(");
    } else {
        braille.processImage(emote.url, -1, 56, 58, false)
            .then((brailleString) => {
                if (typeof brailleString === 'undefined'){
                    sayFunc(channelObj.name, "/me Something went wrong :(");
                } else {
                     sayFunc(channelObj.name, emote.name +" "+brailleString);   
                }
        });
    }
}

module.exports = {
    twoEmoteAsciis: twoEmoteAsciis,
    singleEmoteAsciis: singleEmoteAsciis,
    randomAscii: randomAscii,
    printAscii: printAscii
};