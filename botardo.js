const tmi = require('tmi.js');
const pass = require('./password.js');
const guess = require('./guesstheemote.js');
const braille = require('./generatebraille.js');

const opts = {
  identity: {
    username: "vjbotardo",
    password: pass.password
  },
  channels: [
    "duardo1", "dankardo1"
  ]
};

const client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('disconnected', onDisconnectHandler);

client.connect();


var state = {gameRunning: false, game: ""};

function onMessageHandler (channel, userstate, message, self) {
    if (self) {
        return; 
    }

    const commandName = message.trim();

    if (state.gameRunning){
        state.game(channel, commandName, userstate);
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
    state.gameRunning = true;
    state.game = guessTheEmote;
    if (!guess.getGameState()){
        client.action(channel, 'GUESS THE EMOTE!');
          let emote = guess.getRandomUrl(channel);
          braille.processImage(emote)
            .then((brailleString) => {
                client.say(channel, brailleString);
            });  
    } else {
        if (message === guess.getGameSolution()){
            client.action(channel, user['display-name'] + " guessed it right! It's "+ guess.getGameSolution());
            guess.setGameState(false);
            state.gameRunning = false;
        } else {
            console.log(guess.getGameSolution());
        }
    }
}


function onConnectedHandler (addr, port) {
    guess.loadEmotes();
    for (const channel of opts.channels){
        client.action(channel, "ALLO ZULUL");
    }
    console.log(`* Connected to ${addr}:${port}`);
}

function onDisconnectHandler(reason) {
    console.log(reason);
}