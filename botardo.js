const tmi = require('tmi.js');
const pass = require('./password.js');
const guess = require('./guesstheemote.js');
const emotes = require('./emotes.js');
const db = require('./database.js');
const ttt = require('./tictactoe.js');
const braille = require('./generatebraille.js');
const fetch = require("node-fetch");

opts = {
    options: {
        debug: true
    },
    connection: {
        server: 'irc-ws.chat.twitch.tv',
        port: 80,
        reconnect: true
    },
    identity: {
      username: "vjbotardo",
      password: pass.password
    },
    channels: []
};

const client = new tmi.client(opts);



class Channel {
    constructor(id, name, prefix, modsCanEdit, whileLive){
        this.id = id;
        this.prefix = prefix;
        this.modsCanEdit = modsCanEdit;
        this.whileLive = whileLive;
        this.name = name;
        this.gameRunning = false;
        this.game = null;
        this.emotes = {
            ffzChannel: [],
            ffzGlobal: [],
            bttvChannel: [],
            bttvGlobal: [],
            twitchChannel: [],
            twitchGlobal: []
        };
        this.lastCommandTime = {};
    }
    
    loadEmotes(){
        emotes.loadEmotes(this);
    }
}
var channelsObjs = {};




class Command {
    constructor (name, cooldown, minCooldown, devOnly){
        this.name = name;
        this.cooldown = cooldown;
        this.minCooldown = minCooldown;
        this.devOnly = devOnly;
    }
}
var commandObjs = {};





function loadChannel(id, name, prefix='!', modsCanEdit=true, whileLive=true){
    if (!id || !name){
        return -1;
    }
    try {
        opts.channels.push(name);
        name = '#' + name;
        channelsObjs[name] = new Channel(String(id), name, prefix, Boolean(modsCanEdit), Boolean(whileLive));
        channelsObjs[name].loadEmotes();
        return 1;
    } catch (e) {
        console.error(e);
        return -1;
    }
}

function loadCommand(name, cooldown, minCooldown, devOnly){
    commandObjs[name] = new Command(name, cooldown, minCooldown, Boolean(devOnly));
}




(async function(){
    await db.getAllData(loadCommand, "COMMAND");
    await emotes.loadGlobalEmotes();
    emotes.loadAllExistingEmotes();
    await db.getAllData(loadChannel, "CHANNEL");
    client.connect();
})();


client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('disconnected', onDisconnectHandler);




var sayFunc = function(channel, message){
    client.say(channel, message);
};

function kill(channel, user){
    if (user['user-id'] === 84800191){
        db.closeDB();
        client.action(channel, "bye FeelsBadMan");
        process.exit();
    }
}

function showPoints(channel, userName, userId, anotherUser){
    if (typeof anotherUser !== 'undefined'){
        db.getPoints(channelsObjs[channel], 'display_name', anotherUser, function(_, name, points){
           client.say(channel, "/me " + name + " has " + points + " Ugandan shilling!");
        }); 
    } else {
        db.getPoints(channelsObjs[channel], 'id', userId, function(_, _, points){
            client.say(channel, "/me " + userName + " has " + points + " Ugandan shilling!");
        });
    }
}

function singleEmoteAsciis(channel, mode, userInput){
    function callProcessImage(url){
        let width = mode === 'ascii' ? 58 : 56;
        braille.processImage(url, -1, 56, width, mode === 'ascii')
            .then((brailleString) => {
                if (typeof brailleString === 'undefined'){
                    client.action(channel, "Cant find emote in this channel or invalid link :Z If you added a new emote, do !reload");
                } else {
                    if (mode === 'ascii'){
                        if (Array.isArray(brailleString)){
                            brailleString.forEach(function(brailleFrame){
                                client.say(channel, brailleFrame);
                            });
                        } else {
                            client.say(channel, brailleString);
                        }
                    } else {
                        let brailleLines = brailleString.split(" ");
                        
                        brailleLines = brailleLines.map(function(line){
                            let halfLine = mode === 'mirror' ? line.slice(0, Math.floor(line.length/2)) : braille.mirror(line.slice(Math.floor(line.length/2)));
                            return halfLine + braille.mirror(halfLine);
                        });
                        
                        client.say(channel, brailleLines.join(' '));
                    }
                }
            })
            .catch((error) => {
                client.action(channel, "That did not work :(");
            });
    }
    if (typeof userInput === 'undefined'){
        client.action(channel, "Correct syntax: !ascii/!mirror/!antimirror <emote>|<link>. For more detailed options use: https://vj-duardo.github.io/Braille-Art/");
        return;
    }
    
    if (/(ftp|http|https):\/\/.+/.test(userInput)){
        callProcessImage(userInput);
        return;
    }
    
    for (const list of Object.values(channelsObjs[channel].emotes).concat([emotes.allExisitingEmotes])){
        let emote = list.find(searchEmote => searchEmote.name === userInput);
        if (typeof emote !== 'undefined'){
            callProcessImage(emote.url);
            return;
        }
    }
    callProcessImage(emotes.getEmojiURL(userInput));
}


async function twoEmoteAsciis(channel, mode, inputLeft, inputRight){
    let resultArray = [];
    function callProcessImage(url, treshold = -1){
        let width = mode === 'merge' ? 28 : 58;
        let height = mode === 'stack' ? 28 : 56;
        return braille.processImage(url, treshold, height, width)
            .then((brailleString) => {
                if (typeof brailleString === 'undefined'){
                    client.action(channel, "Cant find emote in this channel or invalid link :Z");
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
                client.action(channel, "That did not work :(");
                return -1;
            });;
    }
    
    if (typeof inputLeft === 'undefined' || typeof inputRight === 'undefined'){
        client.action(channel, "Correct syntax: !merge/!stack/!mix <emote>|<link> <emote>|<link>. For more detailed options use: https://vj-duardo.github.io/Braille-Art/");
        return;
    }
    
    for (let input of [inputLeft, inputRight]){
        if (/(ftp|http|https):\/\/.+/.test(input)){
            await callProcessImage(input);
            continue;
        }
        
        let found = false;
        for (const list of Object.values(channelsObjs[channel].emotes).concat([emotes.allExisitingEmotes])){
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
    client.say(channel, resultArray.join(' '));
}


function randomAscii(channel){
    let allEmotes = emotes.allExisitingEmotes;
    for (const list of Object.values(channelsObjs[channel].emotes)){
        allEmotes = allEmotes.concat(list);
    }
    
    if (typeof allEmotes !== 'undefined' && allEmotes.length > 1){
        singleEmoteAsciis(channel, 'ascii', allEmotes[Math.floor(Math.random() * allEmotes.length)].url);
    } else {
        client.action(channel, "Can't currently find any emotes in this channel!");
    }
}


async function reloadChannelEmotes(channel){
    channelsObjs[channel].loadEmotes();
    await emotes.loadGlobalEmotes();
    client.action(channel, "Reloaded channel emotes.");
}


function ping(channel){
    client.ping()
        .then((data) => {
            client.action(channel, "BING! (" + data*1000 + "ms). Used prefix in this channel: " +channelsObjs[channel].prefix);
        })
        .catch(() => {
            client.action(channel, "Timed out");
        });
}

function about(channel){
    client.action(channel, "A bot by Duardo1. Command list can be found here: https://github.com/VJ-Duardo/VJBotardo/blob/master/commands.md Used prefix in this channel: " +channelsObjs[channel].prefix);
}

function commands(channel){
   client.action(channel, "A command list can be found here: https://github.com/VJ-Duardo/VJBotardo/blob/master/commands.md"); 
}


function getLiveStatus(channel_id){
    let getStreamsUrl = 'https://api.twitch.tv/helix/streams?user_id='+channel_id;
    return fetch(getStreamsUrl, {
        headers: {
            'Authorization': 'Bearer ' + pass.authToken,
            'Client-ID': pass.clientId
        }
    })
    .then((response) => {
         return response.json();
    })
    .then((dataObj) => {
        return dataObj.data.length > 0;
    });
}


async function coolDownCheck(channel, command, seconds, callback, params){
    let channelObj = channelsObjs[channel];
    
    if (!channelObj.whileLive){
        if (await getLiveStatus(channelObj.id))
            return;
    }
    
    
    if (!channelObj.lastCommandTime.hasOwnProperty(command)){
        channelObj.lastCommandTime[command] = 0;
    }
    let now = Math.round(new Date().getTime() / 1000);
    if (now >= channelObj.lastCommandTime[command]+seconds){
        channelObj.lastCommandTime[command] = Math.round(new Date().getTime() / 1000);
        callback(...params);
    }
}

async function devEval(channel, user, input){
    if (user['user-id'] === '84800191') {
        try{
            let output =  await eval(input);
            client.say(channel, String(output));
        } catch(e) {
            console.error(e);
        }
    }
}

function addChannel(channel, user, id, channelName){
    if (user['user-id'] === '84800191') {
        let status = loadChannel(id, channelName);
        if (status === -1){
            client.say(channel, "An Error occured!");
            return;
        }
        client.join('#' + channelName);
        db.insertNewChannel(id, channelName);
        client.say(channel, "Success!");
    }
}


function optionCheck(channel, value, options){
    if (options.includes(value)){
        return true;
    } else {
        client.say(channel, 'Value must be ' + options.join('/'));
        return false;
    }
}

function setBot(channel, user, option, value){
    let channelObj = channelsObjs[channel];
    
    if ((!channelObj.modsCanEdit && user['user-id'] != channelObj.id) 
            || (!user['mod'] && user['user-id'] != channelObj.id)){
        return;
    }
    
    switch(option){
        case 'prefix':
            channelObj.prefix = value.trim();
            db.setChannelValue(channelObj.id, 'prefix', value);
            break;
        case 'modsCanEdit':
        case 'whileLive':
            let columnName = option === 'modsCanEdit' ? 'mods_can_edit' : 'while_live';
            if (optionCheck(channel, value, ['true', 'false'])){
                channelObj.whileLive = value === 'true';
                let boolInteger = value === 'true' ? 1 : 0;
                db.setChannelValue(channelObj.id, columnName, boolInteger);
            } else { return }
            break;
        default:
            return;
    }
    client.action(channel, 'Changed option ' + option + ' to ' + value);
}

function checkBot(channel){
    let channelObj = channelsObjs[channel];
    client.action(channel, "Settings in this channel: prefix: " + channelObj.prefix 
            + ", modsCanEdit: " + channelObj.modsCanEdit 
            + ", whileLive: " + channelObj.whileLive);
}



function onMessageHandler (channel, userstate, message, self) {
    if (self) {
        return; 
    }

    const command = message.trim().split(" ");
    const prefix = channelsObjs[channel].prefix;
    
    switch(command[0]){
        case prefix+'stop':
            kill(channel, userstate);
            break;
        case prefix+'top':
            coolDownCheck(channel, command[0], 5, db.getTopUsers, [5, channel, sayFunc]);
            break;
        case '!ping':
        case prefix+'ping':
            coolDownCheck(channel, command[0], 5, ping, [channel]);
            break;
        case prefix+'ush':
            coolDownCheck(channel, command[0], 5, showPoints, [channel, userstate['display-name'], userstate['user-id'], command[1]]);
            break;
        case '!bot':
        case prefix+'bot':
            coolDownCheck(channel, command[0], 5, about, [channel]);
            break;
        case prefix+'commands':
            coolDownCheck(channel, command[0], 5, commands, [channel]);
            break;
        case prefix+'ascii':
            coolDownCheck(channel, command[0], 6, singleEmoteAsciis, [channel, "ascii", command[1]]);
            break;
        case prefix+'mirror':
            coolDownCheck(channel, command[0], 2, singleEmoteAsciis, [channel, "mirror", command[1]]);
            break;
        case prefix+'antimirror':
            coolDownCheck(channel, command[0], 2, singleEmoteAsciis, [channel, "antimirror", command[1]]);
            break;
        case prefix+'ra':
            coolDownCheck(channel, command[0], 2, randomAscii, [channel]);
            break;
        case prefix+'merge':
            coolDownCheck(channel, command[0], 2, twoEmoteAsciis, [channel, "merge", command[1], command[2]]);
            break;
        case prefix+'stack':
            coolDownCheck(channel, command[0], 2, twoEmoteAsciis, [channel, "stack", command[1], command[2]]);
            break;
        case prefix+'mix':
            coolDownCheck(channel, command[0], 2, twoEmoteAsciis, [channel, "mix", command[1], command[2]]);
            break;
        case prefix+'reload':
            coolDownCheck(channel, command[0], 600, reloadChannelEmotes, [channel]);
            break;
        case prefix+'eval':
            devEval(channel, userstate, command.slice(1).join(" "));
            break;
        case prefix+'addChannel':
            addChannel(channel, userstate, command[1], command[2]);
            break;
        case prefix+'setBot':
            setBot(channel, userstate, command[1], command[2]);
            break;
        case prefix+'checkBot':
            checkBot(channel);
    }

    if (channelsObjs[channel].gameRunning){
        channelsObjs[channel].game(channelsObjs[channel], sayFunc, userstate, command);
    } else{
        if (command[0] === prefix+'guess') {
            coolDownCheck(channel, command[0], 5, guess.guessTheEmote, [channelsObjs[channel], sayFunc, userstate, command]);
        } else if (command[0] === prefix+'ttt'){
            coolDownCheck(channel, command[0], 5, ttt.tictactoe, [channelsObjs[channel], sayFunc, userstate, command]);
        }
    }
}

function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}

function onDisconnectHandler(reason) {
    console.log(reason);
}