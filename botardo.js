const tmi = require('tmi.js');
const pass = require('./password.js');
const guess = require('./guesstheemote.js');
const emotes = require('./emotes.js');
const db = require('./database.js');
const ttt = require('./tictactoe.js');
const braille = require('./generatebraille.js');

const opts = {
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
    channels: [
      "duardo1", "fabzeef"
    ]
};

const client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('disconnected', onDisconnectHandler);

client.connect();



class Channel {
    constructor(name){
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
        this.lastCommandTime = 0;
    }
    
    loadEmotes(){
        emotes.loadEmotes(this);
    }
}

var channelsObjs = {};




var sayFunc = function(channel, message){
    client.say(channel, message);
};

function kill(channel, user){
    if (user === 'Duardo1'){
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

function ascii(channel, userInput){
    function callProcessImage(url){
        braille.processImage(url, -1, 56, 58)
            .then((brailleString) => {
                if (typeof brailleString === 'undefined'){
                    client.action(channel, "Cant find emote in this channel or invalid link :Z");
                } else {
                    client.say(channel, brailleString);
                }
            })
            .catch(() => {
                client.action(channel, "That did not work :(");
            });
    }
    if (typeof userInput === 'undefined'){
        client.action(channel, "Correct syntax: !ascii <emote>|<link>. For more detailed options use: https://vj-duardo.github.io/Braille-Art/");
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


async function merge(channel, inputLeft, inputRight){
    let resultArray = new Array(15).fill('');
    function callProcessImage(url, treshold = -1){
        return braille.processImage(url, treshold, 56, 28)
            .then((brailleString) => {
                if (typeof brailleString === 'undefined'){
                    client.action(channel, "Cant find emote in this channel or invalid link :Z");
                    return -1;
                } else {
                    brailleString.split(' ').forEach(function(line, i){
                        resultArray[i] += line;
                    });
                    return 0;
                }
            })
            .catch(() => {
                client.action(channel, "That did not work :(");
                return -1;
            });;
    }
    
    if (typeof inputLeft === 'undefined' || typeof inputRight === 'undefined'){
        client.action(channel, "Correct syntax: !merge <emote>|<link> <emote>|<link>. For more detailed options use: https://vj-duardo.github.io/Braille-Art/");
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
            
        if (await callProcessImage(emotes.getEmojiURL(input)) === -1){
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
        ascii(channel, allEmotes[Math.floor(Math.random() * allEmotes.length)].url);
    } else {
        client.action(channel, "Can't currently find any emotes in this channel!");
    }
}


function ping(channel){
    client.ping()
        .then((data) => {
            client.action(channel, "BING! (" + data*1000 + "ms)");
        })
        .catch(() => {
            client.action(channel, "Timed out");
        });
}

function about(channel){
    client.action(channel, "A bot by Duardo1. Command list can be found here: https://github.com/VJ-Duardo/VJBotardo/blob/master/commands.md");
}

function coolDownCheck(channel, seconds, callback, params){
    let now = Math.round(new Date().getTime() / 1000);
    if (now >= channelsObjs[channel].lastCommandTime+seconds){
        channelsObjs[channel].lastCommandTime = Math.round(new Date().getTime() / 1000);
        callback(...params);
    }
}




function onMessageHandler (channel, userstate, message, self) {
    if (self) {
        return; 
    }

    const command = message.trim().split(" ");
    
    switch(command[0]){
        case '!stop':
            kill(channel, userstate['display-name']);
            break;
        case '!top':
            coolDownCheck(channel, 5, db.getTopUsers, [5, channel, sayFunc]);
            break;
        case '!ping':
            coolDownCheck(channel, 5, ping, [channel]);
            break;
        case '!ush':
            coolDownCheck(channel, 5, showPoints, [channel, userstate['display-name'], userstate['user-id'], command[1]]);
            break;
        case '!bot':
            coolDownCheck(channel, 5, about, [channel]);
            break;
        case '!ascii':
            coolDownCheck(channel, 2, ascii, [channel, command[1]]);
            break;
        case '!ra':
            coolDownCheck(channel, 2, randomAscii, [channel]);
            break;
        case '!merge':
            coolDownCheck(channel, 2, merge, [channel, command[1], command[2]]);
            break;
    }

    if (channelsObjs[channel].gameRunning){
        channelsObjs[channel].game(channelsObjs[channel], sayFunc, userstate, command);
    } else{
        if (command[0] === '!guess') {
            coolDownCheck(channel, 5, guess.guessTheEmote, [channelsObjs[channel], sayFunc, userstate, command]);
        } else if (command[0] === '!ttt'){
            coolDownCheck(channel, 5, ttt.tictactoe, [channelsObjs[channel], sayFunc, userstate, command]);
        }
    }
}

async function onConnectedHandler (addr, port) {
    emotes.loadAllExistingEmotes();
    await emotes.loadGlobalEmotes();
    for (const channelName of opts.channels){
        //client.action(channelName, "ALLO ZULUL");
        let newChannel = new Channel(channelName);
        newChannel.loadEmotes();
        channelsObjs[channelName] = newChannel;
    }
    console.log(`* Connected to ${addr}:${port}`);
}

function onDisconnectHandler(reason) {
    console.log(reason);
}