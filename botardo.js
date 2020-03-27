const tmi = require('tmi.js');
const pass = require('./password.js');
const guess = require('./guesstheemote.js');
const emotes = require('./emotes.js');
const db = require('./database.js');

const opts = {
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

function coolDownCheck(channel, seconds){
    let now = Math.round(new Date().getTime() / 1000);
    if (now >= channelsObjs[channel].lastCommandTime+seconds){
        return true;
    } else {
        return false;
    }
}




function onMessageHandler (channel, userstate, message, self) {
    if (self) {
        return; 
    }

    const command = message.trim().split(" ");

    if (channelsObjs[channel].gameRunning){
        channelsObjs[channel].game(channelsObjs[channel], sayFunc, userstate, command);
    } else{
        if (command[0] === '!guess') {
            guess.guessTheEmote(channelsObjs[channel], sayFunc, userstate, command);
            console.log(`* Executed ${command} command`);
        } else if (command[0] === '!stop'){
            kill(channel, userstate['display-name']);
        } else if (command[0] === '!top'){
            if (!coolDownCheck(channel, 5)){
                return;
            }
            db.getTopUsers(5, channel, sayFunc);
        } else{
            return;
        }
        
        channelsObjs[channel].lastCommandTime = Math.round(new Date().getTime() / 1000);
    }
}

function onConnectedHandler (addr, port) {
    for (const channelName of opts.channels){
        client.action(channelName, "ALLO ZULUL");
        let newChannel = new Channel(channelName);
        newChannel.loadEmotes();
        channelsObjs[channelName] = newChannel;
    }
    console.log(`* Connected to ${addr}:${port}`);
}

function onDisconnectHandler(reason) {
    console.log(reason);
}