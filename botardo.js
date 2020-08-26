const tmi = require('tmi.js');
const pass = require('./password.js');
const guess = require('./guesstheemote.js');
const emotes = require('./emotes.js');
const db = require('./database.js');
const ttt = require('./tictactoe.js');
const braille = require('./generatebraille.js');
const fetch = require("node-fetch");

const botardoFunctions = {};

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
const devID = '84800191';
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
    constructor (name, cooldown, minCooldown, maxCooldown, devOnly){
        this.name = name;
        this.cooldown = parseInt(cooldown);
        this.minCooldown = parseInt(minCooldown);
        this.maxCooldown = parseInt(maxCooldown);
        this.devOnly = devOnly;
    }
    
    getChannelCooldown(channelID){
        const command = this.name;
        const defaultCooldown = this.cooldown;
        return new Promise(async function(resolve){
            let cooldown = await db.getChannelCommandValue(channelID, command, "cooldown");
            if (typeof cooldown === 'undefined' || cooldown === null){
                resolve(defaultCooldown);
            } else {
                resolve(parseInt(cooldown));
            }
        });
    }
    
    getEnabledStatus(channelID){
        const command = this.name;
        return new Promise(async function(resolve){
            resolve(Boolean(parseInt(await db.getChannelCommandValue(channelID, command, "enabled"))));
        });
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
        channelsObjs[name] = new Channel(String(id), name, prefix, Boolean(parseInt(modsCanEdit)), Boolean(parseInt(whileLive)));
        //channelsObjs[name].loadEmotes();
        return 1;
    } catch (e) {
        console.error(e);
        return -1;
    }
}

function loadCommand(name, cooldown, minCooldown, devOnly, maxCooldown){
    const params = [name, cooldown, minCooldown, maxCooldown, devOnly];
    for (let prm of params){ 
        if (typeof prm === 'undefined')
            return -1;
    }
    commandObjs[name] = new Command(name, cooldown, minCooldown, maxCooldown, Boolean(parseInt(devOnly)));
    return 1;
}




(async function(){
    await db.getAllData(loadCommand, "COMMAND");
    //await emotes.loadGlobalEmotes();
    //emotes.loadAllExistingEmotes();
    await db.getAllData(loadChannel, "CHANNEL");
    client.connect();
})();


client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('disconnected', onDisconnectHandler);




var sayFunc = function(channel, message){
    client.say(channel, message);
};

function kill(channel){
    db.closeDB();
    client.action(channel, "bye FeelsBadMan");
    process.exit();
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

async function allowanceCheck(channel, user, command, callback, params){
    let channelObj = channelsObjs[channel];
    let commandObj = commandObjs[command];
    
    if (user['user-id'] !== devID){
        if (typeof commandObj.devOnly !== 'undefined' && commandObj.devOnly && user['user-id'] !== devID)
            return;

        if (!(await commandObj.getEnabledStatus(channelObj.id)))
            return;

        if (!channelObj.whileLive){
            if (await getLiveStatus(channelObj.id))
                return;
        }
    }
    
    let cooldown = await commandObj.getChannelCooldown(channelObj.id);
    if (!channelObj.lastCommandTime.hasOwnProperty(command)){
        channelObj.lastCommandTime[command] = 0;
    }
    let now = Math.round(new Date().getTime() / 1000);
    if (now >= channelObj.lastCommandTime[command]+cooldown){
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




async function addChannel(channel, user, id, channelName){
    channelName = channelName.toLowerCase();
    let status = loadChannel(id, channelName);
    if (status === -1){
        client.say(channel, "An Error occured!");
        return;
    }
    client.join('#' + channelName);
    let insertStatus = await db.insertNewChannel(id, channelName);
    if (insertStatus === 1){
        let insertCCStatus = await db.insertIntoChannelCommand("channel", id);
        if (insertCCStatus === 1){
            client.say(channel, "Success!");
        } else {
            client.say(channel, String(insertCCStatus));
        }
    } else {
        client.say(channel, String(insertStatus));
    }
}

async function addCommand(channel, name, cooldown, minCooldown, maxCooldown, devOnly){
    if (loadCommand(name, cooldown, minCooldown, maxCooldown, devOnly) === -1){
        client.say(channel, "An Error occured!");
        return;
    }
    let insertStatus = await db.insertNewCommand(name, cooldown, minCooldown, maxCooldown, devOnly);
    if (insertStatus === 1){
        let insertCCStatus = await db.insertIntoChannelCommand("command", name);
        if (insertCCStatus === 1){
            client.say(channel, "Success!");
        } else {
            client.say(channel, String(insertCCStatus));
        }
    } else {
        client.say(channel, String(insertStatus));
    }
}





function optionCheck(channel, value, options){
    if (!options.some(isNaN) && options.length === 2 && !isNaN(value)){
        if (value >= options[0] && value <= options[1])
            return true;
    }
    
    if (options.includes(value))
        return true;
    
    client.say(channel, 'Value must be ' + options.join('-'));
    return false;
}


function modsCanEditCheck(channelObj, user){
    return (!channelObj.modsCanEdit && user['user-id'] != channelObj.id) 
            || (!user['mod'] && user['user-id'] != channelObj.id)
            || (user['user-id'] !== devID);
}

async function setBot(channel, user, option, value){
    if ([user, option, value].includes(undefined)){
        client.action(channel, "Some parameters are missing!");
        return;
    }
    let channelObj = channelsObjs[channel];
    
    if (modsCanEditCheck(channelObj, user))
        return;
    
    let dbStatus;
    switch(option){
        case 'prefix':
            channelObj.prefix = value.trim();
            dbStatus = await db.setChannelValue(channelObj.id, 'prefix', value);
            break;
        case 'modsCanEdit':
        case 'whileLive':
            if (optionCheck(channel, value, ['true', 'false'])){
                channelObj[option] = value === 'true';
                let boolInteger = value === 'true' ? 1 : 0;
                dbStatus = await db.setChannelValue(channelObj.id, option, boolInteger);
            } else { return }
            break;
        default:
            client.action(channel, 'That option cannot be found.');
            return;
    }
    if (dbStatus === 1)
        client.action(channel, 'Changed option ' + option + ' to ' + value);
    else
        client.action(channel, 'Something went wrong in the db.');
}


async function setCommand(channel, user, command, option, value){
    if ([user, command, option, value].includes(undefined)){
        client.action(channel, "Some parameters are missing!");
        return;
    }
    let channelObj = channelsObjs[channel];
    
    if (modsCanEditCheck(channelObj, user))
        return;
    
    if (!Object.keys(commandObjs).includes(command)){
        client.action(channel, "This command cannot be found!");
        return;
    }
    let commandObj = commandObjs[command];
    
    let dbStatus;
    switch(option){
        case 'cooldown':
            if (optionCheck(channel, parseInt(value), [commandObj.minCooldown, commandObj.maxCooldown])){
                dbStatus = await db.setChannelCommandValue(channelObj.id, command, option, value);
            } else { return; }
            break;
        case 'enabled':
            if (optionCheck(channel, value, ['true', 'false'])){
                let boolInteger = value === 'true' ? 1 : 0;
               dbStatus = await db.setChannelCommandValue(channelObj.id, command, option, boolInteger);
            } else { return; };
            break;
        default:
            client.action(channel, 'That option cannot be found.');
            return;
    }
    if (dbStatus === 1)
        client.action(channel, 'Changed option ' + option + ' of ' + command + ' to ' + value);
    else
        client.action(channel, 'Something went wrong in the db.');
        
}






function checkBot(channel){
    let channelObj = channelsObjs[channel];
    client.action(channel, "Settings in this channel: prefix: " + channelObj.prefix 
            + ", modsCanEdit: " + channelObj.modsCanEdit 
            + ", whileLive: " + channelObj.whileLive);
}

async function checkCommand(channel, command){
    let commandObj = commandObjs[command];
    if (commandObj.devOnly)
        return;
    let channelObj = channelsObjs[channel];
    
    let cooldown = await commandObj.getChannelCooldown(channelObj.id);
    let enabled = await commandObj.getEnabledStatus(channelObj.id);
    client.action(channel, "Settings for command " +command + ": " + "cooldown: " + cooldown 
            + " sec, enabled: " + enabled);
}






function onMessageHandler (channel, userstate, message, self) {
    if (self) {
        return; 
    }

    const command = message.trim().split(" ");
    const prefix = channelsObjs[channel].prefix;
    const identParams = [channel, userstate, command[0].replace(prefix, '')];
    
    switch(command[0]){
        case prefix+'stop':
            allowanceCheck(...identParams, kill, [channel]);
            break;
        case prefix+'top':
            allowanceCheck(...identParams, db.getTopUsers, [5, channel, sayFunc]);
            break;
        case '!ping':
        case prefix+'ping':
            allowanceCheck(...identParams, ping, [channel]);
            break;
        case prefix+'ush':
            allowanceCheck(...identParams, showPoints, [channel, userstate['display-name'], userstate['user-id'], command[1]]);
            break;
        case '!bot':
        case prefix+'bot':
            allowanceCheck(...identParams, about, [channel]);
            break;
        case prefix+'commands':
            allowanceCheck(...identParams, commands, [channel]);
            break;
        case prefix+'ascii':
            allowanceCheck(...identParams, singleEmoteAsciis, [channel, "ascii", command[1]]);
            break;
        case prefix+'mirror':
            allowanceCheck(...identParams, singleEmoteAsciis, [channel, "mirror", command[1]]);
            break;
        case prefix+'antimirror':
            allowanceCheck(...identParams, singleEmoteAsciis, [channel, "antimirror", command[1]]);
            break;
        case prefix+'ra':
            allowanceCheck(...identParams, randomAscii, [channel]);
            break;
        case prefix+'merge':
            allowanceCheck(...identParams, twoEmoteAsciis, [channel, "merge", command[1], command[2]]);
            break;
        case prefix+'stack':
            allowanceCheck(...identParams, twoEmoteAsciis, [channel, "stack", command[1], command[2]]);
            break;
        case prefix+'mix':
            allowanceCheck(...identParams, twoEmoteAsciis, [channel, "mix", command[1], command[2]]);
            break;
        case prefix+'reload':
            allowanceCheck(...identParams, reloadChannelEmotes, [channel]);
            break;
        case prefix+'eval':
            allowanceCheck(...identParams, devEval, [channel, userstate, command.slice(1).join(" ")]);
            break;
        case prefix+'addChannel':
            allowanceCheck(...identParams, addChannel, [channel, userstate, command[1], command[2]]);
            break;
        case prefix+'addCommand':
            allowanceCheck(...identParams, addCommand, [channel, command[1], command[2], command[3], command[4], command[5]]);
            break;
        case prefix+'setBot':
            allowanceCheck(...identParams, setBot, [channel, userstate, command[1], command[2]]);         
            break;
        case prefix+'checkBot':
            allowanceCheck(...identParams, checkBot, [channel]);
            break;
        case prefix+'setCommand':
            allowanceCheck(...identParams, setCommand, [channel, userstate, command[1], command[2], command[3]]);
            break;
        case prefix+'checkCommand':
            allowanceCheck(...identParams, checkCommand, [channel, command[1]]);
            break;
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