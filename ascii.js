const braille = require('./generatebraille.js');
const emotes = require('./emotes.js');


function singleEmoteAsciis(channelObj, sayFunc, mode, userInput){
    function callProcessImage(url){
        let width = mode === 'ascii' ? 58 : 56;
        braille.processImage(url, -1, 56, width, mode === 'ascii')
            .then((brailleString) => {
                if (typeof brailleString === 'undefined'){
                    sayFunc(channelObj.name, "/me Cant find emote in this channel or invalid link :Z If you added a new emote, do !reload");
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
        sayFunc(channelObj.name, "/me Correct syntax: !ascii/!mirror/!antimirror <emote>|<link>. For more detailed options use: https://vj-duardo.github.io/Braille-Art/");
        return;
    }
    
    if (/(ftp|http|https):\/\/.+/.test(userInput)){
        callProcessImage(userInput);
        return;
    }
    
    for (const list of Object.values(channelObj.emotes).concat([emotes.allExisitingEmotes])){
        let emote = list.find(searchEmote => searchEmote.name === userInput);
        if (typeof emote !== 'undefined'){
            callProcessImage(emote.url);
            return;
        }
    }
    callProcessImage(emotes.getEmojiURL(userInput));
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
        sayFunc(channelObj.name, "/me Correct syntax: !merge/!stack/!mix <emote>|<link> <emote>|<link>. For more detailed options use: https://vj-duardo.github.io/Braille-Art/");
        return;
    }
    
    for (let input of [inputLeft, inputRight]){
        if (/(ftp|http|https):\/\/.+/.test(input)){
            await callProcessImage(input);
            continue;
        }
        
        let found = false;
        for (const list of Object.values(channelObj.emotes).concat([emotes.allExisitingEmotes])){
            let emote = list.find(searchEmote => searchEmote.name === input);
            if (typeof emote !== 'undefined'){
                found = true;
                await callProcessImage(emote.url);
                break;
            }
        }
        if (found)
            continue;
            
        let processImageResult = await callProcessImage(emotes.getEmojiURL(input));
        if (processImageResult === -1){
            return;
        }
    }
    sayFunc(channelObj.name, resultArray.join(' '));
}


function randomAscii(channelObj, sayFunc){
    let allEmotes = emotes.allExisitingEmotes;
    for (const list of Object.values(channelObj.emotes)){
        allEmotes = allEmotes.concat(list);
    }
    
    if (typeof allEmotes !== 'undefined' && allEmotes.length > 1){
        singleEmoteAsciis(channelObj, sayFunc, 'ascii', allEmotes[Math.floor(Math.random() * allEmotes.length)].url);
    } else {
        sayFunc(channelObj.name, "/me Can't currently find any emotes in this channel!");
    }
}

module.exports = {
    twoEmoteAsciis: twoEmoteAsciis,
    singleEmoteAsciis: singleEmoteAsciis,
    randomAscii: randomAscii
};