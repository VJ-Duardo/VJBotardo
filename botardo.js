const {ChatClient} = require('dank-twitch-irc');
const fetch = require("node-fetch");
const config = require('./configs/config.js');
const guess = require('./modules/guesstheemote.js');
const snake = require('./modules/snake.js');
const darts = require('./modules/darts.js');
const emotes = require('./modules/emotes.js');
const corona = require('./modules/corona.js');
const db = require('./modules/database.js');
const ttt = require('./modules/tictactoe.js');
const ascii = require('./modules/ascii.js');
const brailleData = require('./modules/brailledata.js');

const client = new ChatClient(config.opts);

var commandCount = 0;
var startTime = 0;



class Channel {
    constructor(id, name, prefix, modsCanEdit, whileLive, gifSpam, banphraseAPI, allowIfPajbotDown){
        this.id = id;
        this.prefix = prefix;
        this.minPrefix = 1;
        this.maxPrefix = 20;
        this.modsCanEdit = modsCanEdit;
        this.whileLive = whileLive;
        this.gifSpam = gifSpam;
        this.banphraseAPI = banphraseAPI;
        this.allowIfPajbotDown = allowIfPajbotDown;
        this.name = name;
        this.gameRunning = false;
        this.game = null;
        this.isVipOrMod = false;
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
    
    async loadEmotes(){
        await emotes.loadEmotes(this);
        await db.setChannelValue(this.id, "emotesString", JSON.stringify(this.emotes));
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

async function loadChannel(id, name, prefix='!', modsCanEdit=1, whileLive=1, gifSpam=1, banphraseAPI=null, allowIfPajbotDown=0, emotesString=null){
    if (!id || !name || isNaN(parseInt(id)) || channelsObjs.hasOwnProperty(name)){
        return -1;
    }
    
    prefix = typeof prefix === 'undefined' ? '!' : String(prefix);
      
    try {
        channelsObjs[name] = new Channel(String(id), name, prefix, booleanCheck(modsCanEdit, true), booleanCheck(whileLive, true), booleanCheck(gifSpam, true), banphraseAPI, booleanCheck(allowIfPajbotDown, true));
        await client.join(name);
        
        if (emotesString === null)
            await channelsObjs[name].loadEmotes();
        else
            channelsObjs[name].emotes = JSON.parse(emotesString);
        
        console.log(`Joined channel ${name}`);
        return 1;
    } catch (e) {
        delete channelsObjs[name];
        console.log(`Error: ${name}: ${e}`);
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



var loading = true;
(async function(){
    startTime = new Date().getTime()/1000;
    loadAppAccessToken();
    emotes.loadGlobalEmotes();
    await client.connect();
    await db.getAllData(loadCommand, "COMMAND");
    await db.getAllData(loadChannel, "CHANNEL");
    loading = false;
})();



const sayFunc = async function(channel, nMessage){
    if (nMessage === ""){return;}
    if (channelsObjs[channel].banphraseAPI !== null 
            && !brailleData.pureBrailleRegex.test(nMessage)){
        return fetch(`https://${channelsObjs[channel].banphraseAPI}/api/v1/banphrases/test`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'message': nMessage
            })
        })
        .then(response => {
            if (response.status !== 200 && !channelsObjs[channel].allowIfPajbotDown){
                throw new Error("invalid");
            }
            return response.json();
        })
        .then(async data => {
            if(data.banned){
                await client.me(channel, "[BANPHRASED]");
            } else {
                await client.privmsg(channel, nMessage);
            }
        })
        .catch(async () => {
            await client.me(channel, "The banphrase API cannot be reached at this moment. If you want to allow messages anyway, set the bot option allowIfPajbotDown to true.");
        });
    } else {
        await client.privmsg(channel, nMessage);
    }
};


function kill(channel){
    db.closeDB();
    sayFunc(channel, "/me bye FeelsBadMan");
    process.exit();
}

function showPoints(channel, userName, userId, anotherUser){
    if (typeof anotherUser !== 'undefined'){
        db.getPoints(channelsObjs[channel], 'username', anotherUser, function(_, name, points){
            sayFunc(channel, `/me ${name} has ${points} Ugandan shilling!`);
        }); 
    } else {
        db.getPoints(channelsObjs[channel], 'id', userId, function(_, _, points){
            sayFunc(channel, `/me ${userName} has ${points} Ugandan shilling!`);
        });
    }
}


async function getTop(channel, type){
    const top = 10;
    
    if (typeof type === 'undefined'){
        let p = channelsObjs[channel].prefix;
        sayFunc(channel, `/me Available leaderboards: ${p}top ush, ${p}top snake, ${p}top darts`);
        return;
    }
    
    let topString = await db.getTopUserScores(top, type);
    if (topString !== -1)
        sayFunc(channel, `/me ${topString}`);
}


async function reloadChannelEmotes(channel){
    channelsObjs[channel].loadEmotes();
    emotes.loadGlobalEmotes();
    sayFunc(channel, "/me Reloaded channel emotes.");
}


function ping(channel){
    let pingStart = new Date().getTime();
    client.ping()
        .then(() => {
            sayFunc(channel, `/me BING! (${new Date().getTime()-pingStart}ms). \
Bot running for ${(((new Date().getTime() / 1000) - startTime) / 60).toFixed(2)} minutes. \
Commands used: ${commandCount}. \
Used prefix in this channel: ${channelsObjs[channel].prefix}`);
        })
        .catch(() => {
            sayFunc(channel, "/me Timed out");
        });
}

function about(channel){
    sayFunc(channel, `/me A bot by Duardo1. Command list can be found here: https://gist.github.com/VJ-Duardo/ee90088cb8b8aeec623a6092eaaa38bb Used prefix in this channel: ${channelsObjs[channel].prefix}`);
}

function commands(channel){
    sayFunc(channel, "/me A command list can be found here: https://gist.github.com/VJ-Duardo/ee90088cb8b8aeec623a6092eaaa38bb");
}




async function setNewAppAccessToken() {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${config.clientID}&client_secret=${config.clientSecret}&grant_type=client_credentials`;
    let data = await (await fetch(url, {method: 'POST'})).json();
    db.setToken(data['access_token']);
    config.authToken = data['access_token'];
}

async function loadAppAccessToken() {
    db.getAllData(function(token){
        config.authToken = token;
    },'IMPORTANT');
}


function getLiveStatus(channel_id, channel){
    const getStreamsUrl = `https://api.twitch.tv/helix/streams?user_id=${channel_id}`;
    return fetch(getStreamsUrl, {
        headers: {
            'Authorization': `Bearer ${config.authToken}`,
            'Client-ID': config.clientID
        }
    })
    .then((response) => {
        return response.json();
    })
    .then((dataObj) => {
        if (dataObj.status == 401 && dataObj.message === 'Invalid OAuth token'){
            setNewAppAccessToken();
            sayFunc(channel, '/me [Refreshed app access token] Try again please.');
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
    
    if (!config.devIDs.includes(user['user-id'])){
        if (!channelObj.isVipOrMod){
            client.me(channel, "Due to certain limitations the bot needs vip or mod to function properly. \
                                To limit spam you can still disable commands, adjust cooldowns, disable the spam option and more :) \
                                (Trigger the bot one more time after modding/giving vip)");
            return -1;
        }
        
        if (typeof commandObj.devOnly !== 'undefined' && commandObj.devOnly && !config.devIDs.includes(user['user-id']))
            return -1;

        if (!(await commandObj.getEnabledStatus(channelObj.id)))
            return -1;

        if (!channelObj.whileLive && !["setcommand", "setbot"].includes(command.toLowerCase())){
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
        console.log(`${channel}, ${command}, ${params.filter(par => typeof par !== 'function' && (typeof par !== 'object' || Array.isArray(par)))}`);
        try{
            callback(...params);
        } catch(e){
            console.log(e);
        }
        commandCount++;
        return 1;
    }
}


async function devEval(channel, input){
    try{
        let output =  await eval(input);
        client.say(channel, String(output));
    } catch(e) {
        client.say(channel, e);
    }
}




async function addChannel(channel, id, channelName){
    channelName = typeof channelName !== 'undefined' ? channelName.toLowerCase() : channelName;
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
        client.say(channel, "Cant find that channel here.");
    } else {
        try {
            await client.part(channelObj.name);
        } catch(e){
            client.say(channel, e);
        }
        delete channelsObjs[channelObj.name];
    }
    
    let deleteStatus = await db.deleteChannel(id);
    if (deleteStatus === 1){
        client.say(channel, "Successfully removed channel from db.");
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
    
    sayFunc(channel, `/me Value must be ${options.join('-')}`);
    return false;
}


function modsCanEditCheck(channelObj, user){
    return (channelObj.modsCanEdit && user['mod'])
            || (user['user-id'] === channelObj.id)
            || (config.devIDs.includes(user['user-id']));
}


function isPajbotLinkValid(link){
    return fetch(`https://${link}/api/v1/banphrases/test`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'message': "test"
        })
    })
    .then(response => {
        if (response.status !== 200){
           throw new Error("invalid");
        }
        return response.json();
    })
    .then(data => {
        if(!data.hasOwnProperty("banned")){
            throw new Error("invalid");
        }
        return true;
    })
    .catch(() =>{
       return false;
    });
}


async function setBot(channel, user, option, value){
    let channelObj = channelsObjs[channel];
    if (!modsCanEditCheck(channelObj, user))
        return -1;
    
    if ([user, option, value].includes(undefined)){
        sayFunc(channel, "/me Some parameters are missing!");
        return -1;
    }
    
    let dbStatus;
    switch(option){
        case 'prefix':
            const prefixRegex = `^[a-zA-Z0-9^!?"'#$%&\\(\\)\\[\\]{}=+*~\\-_,;@<>°]{${channelObj.minPrefix},${channelObj.maxPrefix}}$`;
            value = value.trim();
            if (new RegExp(prefixRegex).test(value)){
                channelObj.prefix = value;
                dbStatus = await db.setChannelValue(channelObj.id, 'prefix', value);
            } else { 
                sayFunc(channel, `/me Allowed characters: a-zA-Z0-9^!?"'#$%&()[]{}=+*~\\-_,;@<>° Min length: ${channelObj.minPrefix}, Max length: ${channelObj.maxPrefix}`);
                return -1;}
            break;
        case 'modsCanEdit':
            if (!(user['user-id'] === channelObj.id) && (!config.devIDs.includes(user['user-id'])))
                return -1;
        case 'gifSpam':
        case 'whileLive':
        case 'allowIfPajbotDown':
            if (optionCheck(channel, value, ['true', 'false'])){
                channelObj[option] = value === 'true';
                let boolInteger = value === 'true' ? 1 : 0;
                dbStatus = await db.setChannelValue(channelObj.id, option, boolInteger);
            } else { return -1;}
            break;
        case 'banphraseAPI':
            value = value.toLowerCase();
            if (value !== "null" && await isPajbotLinkValid(value) === false){
                sayFunc(channel, "/me The url seems to be invalid. If it's correct, make sure the pajbot is running.");
                return -1;
            }
            if (value === "null"){
                dbStatus = await db.setChannelValue(channelObj.id, 'banphraseAPI', null);
                channelObj[option] = null;
            } else {
                dbStatus = await db.setChannelValue(channelObj.id, 'banphraseAPI', value);
                channelObj[option] = value;
            }
            break;
        default:
            sayFunc(channel, '/me That option cannot be found.');
            return -1;
    }
    if (dbStatus === 1)
        sayFunc(channel, `/me Changed option ${option} to ${value}`);
    else
        sayFunc(channel, '/me Something went wrong in the db.');
    return 1;
}


async function setCommand(channel, user, command, option, value){
    let channelObj = channelsObjs[channel];  
    if (!modsCanEditCheck(channelObj, user))
        return -1;
    
    if ([user, command, option, value].includes(undefined)){
        sayFunc(channel, "/me Some parameters are missing!");
        return -1;
    }
    
    if (!Object.keys(commandObjs).includes(command)){
        sayFunc(channel, "/me This command cannot be found!");
        return -1;
    }
    let commandObj = commandObjs[command];
    if (commandObj.devOnly)
        return -1;
    
    if (!commandObj.changeable && !config.devIDs.includes(user['user-id'])){
        sayFunc(channel, '/me Don\'t change this command please. :/');
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
            sayFunc(channel, '/me That option cannot be found.');
            return -1;
    }
    if (dbStatus === 1)
        sayFunc(channel, `/me Changed option ${option} of ${command} to ${value}`);
    else
        sayFunc(channel, '/me Something went wrong in the db.');
    return 1;
        
}






function checkBot(channel){
    let channelObj = channelsObjs[channel];
    let channelAttributes = ['prefix', 'modsCanEdit', 'whileLive', 'gifSpam', 'banphraseAPI', 'allowIfPajbotDown'].map(attr => {return `${attr}: ${channelObj[attr]}`;}).join(', ');
    sayFunc(channel, `/me Settings in this channel: ${channelAttributes}`);
}

async function checkCommand(channel, command){
    if (!commandObjs.hasOwnProperty(command)){
        sayFunc(channel, "/me Unknown command!");
        return;
    }
    let commandObj = commandObjs[command];
    if (commandObj.devOnly)
        return -1;
    let channelObj = channelsObjs[channel];
    
    let cooldown = await commandObj.getChannelCooldown(channelObj.id);
    let enabled = await commandObj.getEnabledStatus(channelObj.id);
    sayFunc(channel, `/me Settings for command ${command}: cooldown: ${cooldown} sec, enabled: ${enabled}`);
}





async function suggest(channel, user, content){
    let status = await fetch('https://api.github.com/repos/VJ-Duardo/VJBotardo/issues', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            title: user['username'],
            body: `From #${channel}: ${content !== '' ? content : "(no message, most likely channel request)"}`
        })
    })
    .then(response => {
        if (response.status !== 201){
            return -1;
        }
        return response.json();
    })
    .then(data => {
        return data.number;
    })
    .catch(e => {
        console.log(e);
        return -1;
    });
      
    if (status !== -1 && typeof status !== 'undefined'){
        sayFunc(channel, `/me Suggestion was saved under number #${status}.`);
        return;
    }
    sayFunc(channel, "/me There was an issue, suggestion was most likely not saved :(");
}


client.on("USERSTATE", (msg) => {
    if (typeof channelsObjs[msg.channelName] !== 'undefined'){
        channelsObjs[msg.channelName].isVipOrMod = msg.badges.hasModerator || msg.badges.hasVIP || msg.badges.hasBroadcaster;
    }
});


client.on("PRIVMSG", (msg) => {
    if (!channelsObjs.hasOwnProperty(msg.channelName) || loading) {
        return; 
    }
    let userstate = {
        'username': msg.senderUsername,
        'user-id': msg.senderUserID,
        'display-name': msg.displayName,
        'mod': msg.isMod
    };
    let channel = msg.channelName;
    let message = msg.messageText;

    const command = message.replace('󠀀', '').trim().split(/\s+/);
    const prefix = channelsObjs[channel].prefix;
    const identParams = [channel, userstate, command[0].replace(prefix, '')];
    
    switch(command[0]){
        case `${prefix}stop`:
            allowanceCheck(...identParams, kill, [channel]);
            break;
        case `${prefix}top`:
            allowanceCheck(channel, userstate, 'top', getTop, [channel, command[1]]);
            break;
        case '!ping':
        case `${prefix}ping`:
            allowanceCheck(channel, userstate, 'ping', ping, [channel]);
            break;
        case `${prefix}ush`:
            allowanceCheck(...identParams, showPoints, [channel, userstate['username'], userstate['user-id'], command[1]]);
            break;
        case `${prefix}bot`:
            allowanceCheck(channel, userstate, 'bot', about, [channel]);
            break;
        case `${prefix}commands`:
            allowanceCheck(...identParams, commands, [channel]);
            break;
        case `${prefix}corona`:
            allowanceCheck(...identParams, corona.corona, [channelsObjs[channel], sayFunc, command.slice(1, command.length).join(" ")]);
            break;
        case `${prefix}ascii`:
            allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "ascii", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case `${prefix}mirror`:
            allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "mirror", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case `${prefix}antimirror`:
            allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "antimirror", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case `${prefix}ra`:
            allowanceCheck(...identParams, ascii.randomAscii, [channelsObjs[channel], sayFunc, channelsObjs[channel].gifSpam, command.slice(1, command.length)]);
            break;
        case `${prefix}merge`:
            allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "merge", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case `${prefix}stack`:
            allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "stack", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case `${prefix}mix`:
            allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "mix", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case `${prefix}overlay`:
             allowanceCheck(...identParams, ascii.printAscii, [channelsObjs[channel], sayFunc, "overlay", command.slice(1, command.length), channelsObjs[channel].gifSpam]);
            break;
        case `${prefix}reload`:
            allowanceCheck(...identParams, reloadChannelEmotes, [channel]);
            break;
        case '!eval':
        case `${prefix}eval`:
            allowanceCheck(channel, userstate, 'eval', devEval, [channel, command.slice(1).join(" ")]);
            break;
        case `${prefix}addChannel`:
            allowanceCheck(...identParams, addChannel, [channel, command[1], command[2]]);
            break;
        case `${prefix}removeChannel`:
            allowanceCheck(...identParams, removeChannel, [channel, command[1]]);
            break;
        case `${prefix}addCommand`:
            allowanceCheck(...identParams, addCommand, [channel, command[1], command[2], command[3], command[4], command[5], command[6]]);
            break;
        case `${prefix}setbot`:
        case `${prefix}setBot`:
            allowanceCheck(channel, userstate, 'setBot', setBot, [channel, userstate, command[1], command[2]]);
            break;
        case `${prefix}checkbot`:
        case `${prefix}checkBot`:
            allowanceCheck(channel, userstate, 'checkBot', checkBot, [channel]);
            break;
        case `${prefix}setcommand`:
        case `${prefix}setCommand`:
            allowanceCheck(channel, userstate, 'setCommand', setCommand, [channel, userstate, command[1], command[2], command[3]]);
            break;
        case `${prefix}checkcommand`:
        case `${prefix}checkCommand`:
            allowanceCheck(channel, userstate, 'checkCommand', checkCommand, [channel, command[1]]);
            break;
        case `${prefix}suggest`:
            allowanceCheck(...identParams, suggest, [channel, userstate, command.slice(1).join(" ")]);
            break;
    }

    if (channelsObjs[channel].gameRunning){
        channelsObjs[channel].game(channelsObjs[channel], sayFunc, userstate, command);
    } else{
        switch (command[0]){
            case `${prefix}guess`:
                allowanceCheck(...identParams, guess.guessTheEmote, [channelsObjs[channel], sayFunc, userstate, command]);
                break;
            case `${prefix}ttt`:
                allowanceCheck(...identParams, ttt.tictactoe, [channelsObjs[channel], sayFunc, userstate, command]);
                break;
            case `${prefix}snake`:
                allowanceCheck(...identParams, snake.playSnake, [channelsObjs[channel], sayFunc, userstate, command]);
                break;
            case `${prefix}darts`:
                allowanceCheck(...identParams, darts.playDarts, [channelsObjs[channel], sayFunc, userstate, command]);
                break;
        }
    }
});
