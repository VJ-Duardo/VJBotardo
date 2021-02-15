const db = require('./database.js');
const fetch = require("node-fetch");
const pass = require('./password.js');
const request = require('request');
const JSONStream = require('JSONStream');
const es = require('event-stream');


process.on('message', async function(m) {
  if (m === "getTwitchEverything"){
      let r = await getTwitchEverything();
      process.send(r);
  }
});

async function getTwitchEverything(){
    const twitchEmoteAPI = 'https://api.twitch.tv/kraken/chat/emoticons';
    
    const count = await db.getRandomEmoteStat("");
    let prom =  new Promise(function(resolve){
        db.sendQuery('BEGIN TRANSACTION;');
        request({
            headers: {
              'Accept': 'application/vnd.twitchtv.v5+json',
              'Client-ID': pass.clientId
            },
            url: twitchEmoteAPI
        })
        .pipe(JSONStream.parse('emoticons.*'))
        .pipe(es.mapSync(function(data) {
            db.insertEmote(data['id'], data['regex'], data['images']['url'].replace('1.0', '3.0'));
        }))
        .on('end', function(){
            db.sendQuery('END TRANSACTION;');
            resolve();
        });
    });
    try {
        await prom;
        console.log(`${await db.getRandomEmoteStat("") - count} new emotes added!`);
    } catch(e){
        console.log(e);
        return "error";
    }
    
    return "done";
}