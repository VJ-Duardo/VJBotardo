const tmi = require('tmi.js');
const pass = require('./password.js');
const guess = require('./guesstheemote.js');
const emotes = require('./emotes.js');
const db = require('./database.js');
const ttt = require('./tictactoe.js');

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
      "duardo1", "fabzeef", "ebbel"
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

function ping(channel){
    client.ping()
        .then((data) => {
            client.action(channel, "BING! (" + data*1000 + "ms)");
        })
        .catch(() => {
            client.action(channel, "Timed out");
        });
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

function onConnectedHandler (addr, port) {
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