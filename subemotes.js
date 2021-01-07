const db = require('./database.js');
const fetch = require("node-fetch");
const pass = require('./password.js');


process.on('message', async function(m) {
  if (m === "getTwitchEverything"){
      let r = await getTwitchEverything();
      process.send(r);
  }
});

async function getTwitchEverything(){
    let twitchEmoteAPI = 'https://api.twitch.tv/kraken/chat/emoticons';
    
    console.log('start of emote loading');
    return fetch(twitchEmoteAPI, {
        headers: {
            'Accept': 'application/vnd.twitchtv.v5+json',
            'Client-ID': pass.clientId
        }
    })
    .then((response) => {
        return response.json();
    })
    .then(async(dataObj) => {
        if(dataObj.hasOwnProperty("error")){
            if (typeof dataObj !== 'undefined')
                console.log(dataObj);
            return "error";
        }
        
        const count = await db.getRandomEmoteStat("");
        let emoteList = dataObj['emoticons'];
        console.log('emote data loaded');
        await (async function(){
            //db.sendQuery('PRAGMA cache_size=10000;');
            db.sendQuery('BEGIN TRANSACTION;');
            for (i=0; i<emoteList.length; i++){
                await db.insertEmote(emoteList[i]['id'], emoteList[i]['regex'], emoteList[i]['images']['url'].replace('1.0', '3.0'));
            }
            db.sendQuery('END TRANSACTION;');
            console.log((await db.getRandomEmoteStat("") - count) + " new emotes added!");
        })();
        return "done";
    });
}