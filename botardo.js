const tmi = require('tmi.js');
const pass = require('./password.js');
const guess = require('./guesstheemote.js');
const snake = require('./snake.js');
const darts = require('./darts.js');
const emotes = require('./emotes.js');
const db = require('./database.js');
const ttt = require('./tictactoe.js');
const braille = require('./generatebraille.js');
const fetch = require("node-fetch");
const ascii = require('./ascii.js');

opts = {
    options: {
        debug: false
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

var commandCount = 0;
var startTime = 0;



class Channel {
    constructor(id, name, prefix, modsCanEdit, whileLive, gifSpam){
        this.id = id;
        this.prefix = prefix;
        this.minPrefix = 1;
        this.maxPrefix = 20;
        this.modsCanEdit = modsCanEdit;
        this.whileLive = whileLive;
        this.gifSpam = gifSpam;
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
    constructor (name, cooldown, minCooldown, maxCooldown, devOnly, changeable){
        this.name = name;
        this.cooldown = cooldown;
        this.minCooldown = minCooldown;
        this.maxCooldown = maxCooldown;
        this.devOnly = devOnly;
        this.changeable = changeable;
    }
    
    getChannelCooldown(channelID){
        const command = this.name;
        const defaultCooldown = this.cooldown;
        return new Promise(async function(resolve){
            let cooldown = await db.getChannelCommandValue(channelID, command, "cooldown");
            if (cooldown === -1 || typeof cooldown === 'undefined' || cooldown === null){
                resolve(defaultCooldown);
            } else {
                resolve(parseInt(cooldown));
            }
        });
    }
    
    getEnabledStatus(channelID){
        const command = this.name;
        return new Promise(async function(resolve){
            resolve(booleanCheck(await db.getChannelCommandValue(channelID, command, "enabled"), false));
        });
    }
}
var commandObjs = {};




function booleanCheck(bool, defaultBool){
    if (typeof bool !== 'undefined' && (parseInt(bool) === 0 || parseInt(bool) === 1))
        return Boolean(parseInt(bool));
    else 
        return defaultBool;
}

async function loadChannel(id, name, prefix='!', modsCanEdit=1, whileLive=1, gifSpam=1){
    if (!id || !name || isNaN(parseInt(id)) || channelsObjs.hasOwnProperty('#'+name)){
        return -1;
    }
    
    prefix = typeof prefix === 'undefined' ? '!' : String(prefix);
    name = '#' + name.toLowerCase();
      
    try {
        await client.join(name);
        channelsObjs[name] = new Channel(String(id), name, prefix, booleanCheck(modsCanEdit, true), booleanCheck(whileLive, true), booleanCheck(gifSpam, true));
        channelsObjs[name].loadEmotes();
        return 1;
    } catch (e) {
        console.log("Error: " +name+ ": " +e);
        return -1;
    }
}

function loadCommand(name, cooldown, minCooldown, devOnly, maxCooldown=600000, changeable=1){
    if ([name, cooldown, minCooldown, devOnly].includes(undefined) || commandObjs.hasOwnProperty(name))
        return -1;
    
    if (isNaN(parseInt(cooldown)) || isNaN(parseInt(minCooldown)))
        return -1;
    
    maxCooldown = (typeof maxCooldown === 'undefined' || isNaN(parseInt(maxCooldown)) ? 600000 : parseInt(maxCooldown));
        
    commandObjs[name] = new Command(name, parseInt(cooldown), parseInt(minCooldown), maxCooldown, booleanCheck(devOnly, false), booleanCheck(changeable, true));
    return 1;
}




(async function(){
    startTime = new Date().getTime()/1000;
    pass.loadAppAccessToken();
    emotes.loadGlobalEmotes();
    await client.connect();
    //emotes.loadTwitchSubEmotes();
    await db.getAllData(loadCommand, "COMMAND");
    db.getAllData(loadChannel, "CHANNEL");
})();


client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('disconnected', onDisconnectHandler);
client.on("notice", (channel, msgID, message) => {
    if (msgID === "msg_channel_suspended")
        console.log(channel+ ": " +message);
});




const sayFunc = function(channel, message){
    client.say(channel, message);
};


function kill(channel){
    db.closeDB();
    client.action(channel, "bye FeelsBadMan");
    process.exit();
}

function showPoints(channel, userName, userId, anotherUser){
    if (typeof anotherUser !== 'undefined'){
        db.getPoints(channelsObjs[channel], 'username', anotherUser, function(_, name, points){
           client.say(channel, "/me " + name + " has " + points + " Ugandan shilling!");
        }); 
    } else {
        db.getPoints(channelsObjs[channel], 'id', userId, function(_, _, points){
            client.say(channel, "/me " + userName + " has " + points + " Ugandan shilling!");
        });
    }
}


async function getTopUsh(channel){
    let top = 10;
    let topString = await db.getTopUserScores(top, 'points');
    client.action(channel, topString);
}


async function reloadChannelEmotes(channel){
    channelsObjs[channel].loadEmotes();
    emotes.loadGlobalEmotes();
    client.action(channel, "Reloaded channel emotes.");
}


function ping(channel){
    client.ping()
        .then((data) => {
            client.action(channel, "BING! (" + data*1000 + "ms). \
            Bot running for " + (((new Date().getTime()/1000)-startTime)/60).toFixed(2) + " minutes. \
            Commands used: " + commandCount + ". \
            Used prefix in this channel: " +channelsObjs[channel].prefix);
        })
        .catch(() => {
            client.action(channel, "Timed out");
        });
}

function about(channel){
    client.action(channel, "A bot by Duardo1. Command list can be found here: https://gist.github.com/VJ-Duardo/ee90088cb8b8aeec623a6092eaaa38bb Used prefix in this channel: " +channelsObjs[channel].prefix);
}

function commands(channel){
   client.action(channel, "A command list can be found here: https://gist.github.com/VJ-Duardo/ee90088cb8b8aeec623a6092eaaa38bb");
}



function getLiveStatus(channel_id, channel){
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
        if (dataObj.status == 401 && dataObj.message === 'Invalid OAuth token'){
            pass.setNewAppAccessToken();
            client.action(channel, '[Refreshed app access token] Try again please.');
            return true;
        }
        return dataObj.data.length > 0;
    })
    .catch((error) => {
        console.log(error);
        return true;
    });
}

async function allowanceCheck(channel, user, command, callback, params){
    let channelObj = channelsObjs[channel];
    let commandObj = commandObjs[command];
    if (!channelObj || !commandObj)
        return -1;
    
    if (user['user-id'] !== devID){
        if (typeof commandObj.devOnly !== 'undefined' && commandObj.devOnly && user['user-id'] !== devID)
            return -1;

        if (!(await commandObj.getEnabledStatus(channelObj.id)))
            return -1;

        if (!channelObj.whileLive){
            if (await getLiveStatus(channelObj.id, channel))
                return -1;
        }
    }
    
    let cooldown = await commandObj.getChannelCooldown(channelObj.id);
    if (!channelObj.lastCommandTime.hasOwnProperty(command)){
        channelObj.lastCommandTime[command] = 0;
    }
    let now = Math.round(new Date().getTime() / 1000);
    if (now >= channelObj.lastCommandTime[command]+cooldown){
        channelObj.lastCommandTime[command] = Math.round(new Date().getTime() / 1000);
        console.log(channel +", "+ command +", "+ params.filter(par => typeof par !== 'function' && (typeof par !== 'object' || Array.isArray(par))));
        callback(...params);
        commandCount++;
        return 1;
    }
}


async function devEval(channel, user, input){
    try{
        let output =  await eval(input);
        client.say(channel, String(output));
    } catch(e) {
        client.say(channel, e);
    }
}




async function addChannel(channel, id, channelName){
    let status = await loadChannel(id, channelName);
    if (status === -1){
        client.say(channel, "An Error occured!");
        return -1;
    }
    
    let insertStatus = await db.insertNewChannel(id, channelName);
    if (insertStatus === 1){
        let insertCCStatus = await db.insertIntoChannelCommand("channel", id);
        if (insertCCStatus === 1){
            client.say(channel, "Success!");
            return 1;
        } else {
            client.say(channel, String(insertCCStatus));
            return -1;
        }
    } else {
        client.say(channel, String(insertStatus));
        return -1;
    }
}

async function removeChannel(channel, id){
    channelObj = Object.values(channelsObjs).find(obj => obj.id === id);
    if (typeof channelObj === 'undefined' || !channelsObjs.hasOwnProperty(channelObj.name)){
        client.say(channel, "Cant find that channel.");
        return -1;
    }
    
    try {
        await client.part(channelObj.name);
    } catch(e){
        client.say(channel, e);
    }
    
    delete channelsObjs[channelObj.name];
    
    let deleteStatus = await db.deleteChannel(id);
    if (deleteStatus === 1){
        client.say(channel, "Successfully removed channel.");
        return 1;
    } else {
        client.say(channel, String(deleteStatus));
        return -1;
    }
}



async function addCommand(channel, name, cooldown, minCooldown, devOnly, changeable, maxCooldown){
    if (loadCommand(name, cooldown, minCooldown, devOnly, maxCooldown, changeable) === -1){
        client.say(channel, "An Error occured!");
        return -1;
    }
    let insertStatus = await db.insertNewCommand(name, cooldown, minCooldown, commandObjs[name].maxCooldown, devOnly, changeable);
    if (insertStatus === 1){
        if (commandObjs[name].devOnly){
            client.say(channel, "Success!");
            return 2;
        }
        let insertCCStatus = await db.insertIntoChannelCommand("command", name);
        if (insertCCStatus === 1){
            client.say(channel, "Success!");
            return 1;
        } else {
            client.say(channel, String(insertCCStatus));
            return -1;
        }
    } else {
        client.say(channel, String(insertStatus));
        return -1;
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
    return (channelObj.modsCanEdit && user['mod'])
            || (user['user-id'] == channelObj.id)
            || (user['user-id'] == devID);
}


async function setBot(channel, user, option, value){
    let channelObj = channelsObjs[channel];
    if (!modsCanEditCheck(channelObj, user))
        return -1;
    
    if ([user, option, value].includes(undefined)){
        client.action(channel, "Some parameters are missing!");
        return -1;
    }
    
    let dbStatus;
    switch(option){
        case 'prefix':
            const prefixRegex = '^[a-zA-Z0-9^!?\"\'#$%&\\(\\)\\[\\]{}=+*~\\-_,;@<>°]{'+channelObj.minPrefix+','+channelObj.maxPrefix+'}$';
            value = value.trim();
            if (new RegExp(prefixRegex).test(value)){
                channelObj.prefix = value;
                dbStatus = await db.setChannelValue(channelObj.id, 'prefix', value);
            } else { 
                client.action(channel, 'Allowed characters: a-zA-Z0-9^!?"\'#$%&()[]{}=+*~\\-_,;@<>° Min length: '+channelObj.minPrefix+', Max length: '+channelObj.maxPrefix);
                return -1;}
            break;
        case 'modsCanEdit':
            if (!(user['user-id'] == channelObj.id) && !(user['user-id'] == devID))
                return -1;
        case 'gifSpam':
        case 'whileLive':
            if (optionCheck(channel, value, ['true', 'false'])){
                channelObj[option] = value === 'true';
                let boolInteger = value === 'true' ? 1 : 0;
                dbStatus = await db.setChannelValue(channelObj.id, option, boolInteger);
            } else { return -1;}
            break;
        default:
            client.action(channel, 'That option cannot be found.');
            return -1;
    }
    if (dbStatus === 1)
        client.action(channel, 'Changed option ' + option + ' to ' + value);
    else
        client.action(channel, 'Something went wrong in the db.');
    return 1;
}


async function setCommand(channel, user, command, option, value){
    let channelObj = channelsObjs[channel];  
    if (!modsCanEditCheck(channelObj, user))
        return -1;
    
    if ([user, command, option, value].includes(undefined)){
        client.action(channel, "Some parameters are missing!");
        return -1;
    }
    
    if (!Object.keys(commandObjs).includes(command)){
        client.action(channel, "This command cannot be found!");
        return -1;
    }
    let commandObj = commandObjs[command];
    if (commandObj.devOnly)
        return -1;
    
    if (!commandObj.changeable && user['user-id'] !== devID){
        client.action(channel, 'Don\'t change this command please. :/');
        return -1;
    }
        
    
    let dbStatus;
    switch(option){
        case 'cooldown':
            if (optionCheck(channel, parseInt(value), [commandObj.minCooldown, commandObj.maxCooldown])){
                value = parseInt(value);
                dbStatus = await db.setChannelCommandValue(channelObj.id, command, option, value);
            } else { return -1; }
            break;
        case 'enabled':
            if (optionCheck(channel, value, ['true', 'false'])){
                let boolInteger = value === 'true' ? 1 : 0;
                dbStatus = await db.setChannelCommandValue(channelObj.id, command, option, boolInteger);
            } else { return -1; };
            break;
        default:
            client.action(channel, 'That option cannot be found.');
            return -1;
    }
    if (dbStatus === 1)
        client.action(channel, 'Changed option ' + option + ' of ' + command + ' to ' + value);
    else
        client.action(channel, 'Something went wrong in the db.');
    return 1;
        
}






function checkBot(channel){
    let channelObj = channelsObjs[channel];
    let channelAttributes = ['prefix', 'modsCanEdit', 'whileLive', 'gifSpam'].map(attr => {return attr+': '+channelObj[attr];}).join(', ');
    client.action(channel, "Settings in this channel: "+ channelAttributes);
}

async function checkCommand(channel, command){
    let commandObj = commandObjs[command];
    if (commandObj.devOnly)
        return -1;
    let channelObj = channelsObjs[channel];
    
    let cooldown = await commandObj.getChannelCooldown(channelObj.id);
    let enabled = await commandObj.getEnabledStatus(channelObj.id);
    client.action(channel, "Settings for command " +command + ": " + "cooldown: " + cooldown 
            + " sec, enabled: " + enabled);
}






function onMessageHandler (channel, userstate, message, self) {
    if (self || !channelsObjs.hasOwnProperty(channel)) {
        return; 
    }

    const command = message.replace('󠀀', '').trim().split(" ");
    const prefix = channelsObjs[channel].prefix;
    const identParams = [channel, userstate, command[0].replace(prefix, '')];
    
    switch(command[0]){
        case prefix+'stop':
            allowanceCheck(...identParams, kill, [channel]);
            break;
        case prefix+'top':
            allowanceCheck(channel, userstate, 'top', getTopUsh, [channel]);
            break;
        case '!ping':
        case prefix+'ping':
            allowanceCheck(channel, userstate, 'ping', ping, [channel]);
            break;
        case prefix+'ush':
            allowanceCheck(...identParams, showPoints, [channel, userstate['username'], userstate['user-id'], command[1]]);
            break;
        case prefix+'bot':
            allowanceCheck(channel, userstate, 'bot', about, [channel]);
            break;
        case prefix+'commands':
            allowanceCheck(...identParams, commands, [channel]);
            break;
        case prefix+'ascii':
            allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "ascii", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case prefix+'mirror':
            allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "mirror", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case prefix+'antimirror':
            allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "antimirror", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case prefix+'ra':
            allowanceCheck(...identParams, ascii.randomAscii, [channelsObjs[channel], sayFunc, command.slice(1, command.length)]);
            break;
        case prefix+'merge':
            allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "merge", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case prefix+'stack':
            allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "stack", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case prefix+'mix':
            allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "mix", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case prefix+'reload':
            allowanceCheck(...identParams, reloadChannelEmotes, [channel]);
            break;
        case '!eval':
        case prefix+'eval':
            allowanceCheck(channel, userstate, 'eval', devEval, [channel, userstate, command.slice(1).join(" ")]);
            break;
        case prefix+'addChannel':
            allowanceCheck(...identParams, addChannel, [channel, command[1], command[2]]);
            break;
        case prefix+'removeChannel':
            allowanceCheck(...identParams, removeChannel, [channel, command[1]]);
            break;
        case prefix+'addCommand':
            allowanceCheck(...identParams, addCommand, [channel, command[1], command[2], command[3], command[4], command[5], command[6]]);
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
        switch (command[0]){
            case prefix+'guess':
                allowanceCheck(...identParams, guess.guessTheEmote, [channelsObjs[channel], sayFunc, userstate, command]);
                break;
            case prefix+'ttt':
                allowanceCheck(...identParams, ttt.tictactoe, [channelsObjs[channel], sayFunc, userstate, command]);
                break;
            case prefix+'snake':
                allowanceCheck(...identParams, snake.playSnake, [channelsObjs[channel], sayFunc, userstate, command]);
                break;
            case prefix+'darts':
                allowanceCheck(...identParams, darts.playDarts, [channelsObjs[channel], sayFunc, userstate, command]);
                break;
        }
    }
}

function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}

function onDisconnectHandler(reason) {
    console.log(reason);
}