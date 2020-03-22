const tmi = require('tmi.js');
const pass = require('./password.js');
const guess = require('./guesstheemote.js');
const braille = require('./generatebraille.js');
const emotes = require('./emotes.js');

const opts = {
  identity: {
    username: "vjbotardo",
    password: pass.password
  },
  channels: [
    "duardo1"
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
    }
    
    loadEmotes(){
        emotes.loadEmotes(this);
    }
}

var channelsObjs = {};



function onMessageHandler (channel, userstate, message, self) {
    if (self) {
        return; 
    }

    const commandName = message.trim();

    if (channelsObjs[channel].gameRunning){
        channelsObjs[channel].game(channel, commandName, userstate);
    } else{
        if (commandName === '!guess') {
            guessTheEmote(channel);
            console.log(`* Executed ${commandName} command`);
        } else {
            console.log(`* Unknown command ${commandName}`);
        }
    }
}


function guessTheEmote(channel, message="", user=""){
    if (typeof channelsObjs[channel].emotes.ffzChannel === 'undefined'){
        client.action(channel, 'No ffz emotes in this chat!');
        return;
    }
    channelsObjs[channel].gameRunning = true;
    channelsObjs[channel].game = guessTheEmote;
    if (!guess.getGameState(channel)){
        let emote = guess.getRandomUrl(channelsObjs[channel]);
        braille.processImage(emote)
            .then((brailleString) => {
                if (typeof brailleString === 'undefined'){
                    guess.endGame(channel);
                    guessTheEmote(channel);
                } else {
                    client.action(channel, 'GUESS THE EMOTE!');
                    client.say(channel, brailleString);
                }
            });  
    } else {
        if (message === guess.getGameSolution(channel)){
            client.action(channel, user['display-name'] + " guessed it right! It's "+ guess.getGameSolution(channel));
            guess.endGame(channel);
            channelsObjs[channel].gameRunning = false;
        } else {
            console.log(guess.getGameSolution(channel));
        }
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