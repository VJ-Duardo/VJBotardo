const tmi = require('tmi.js');
const pass = require('./password.js');

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


function onMessageHandler (channel, userstate, message, self) {
    if (self) {
        return; 
    }

    const commandName = message.trim();

    if (commandName === '!guess') {
        client.action(channel, 'testest');
        console.log(`* Executed ${commandName} command`);
    } else {
        console.log(`* Unknown command ${commandName}`);
    }
}


function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}

function onDisconnectHandler(reason) {
    console.log(reason);
}