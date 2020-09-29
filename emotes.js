const fetch = require("node-fetch");
const schedule = require('node-schedule');
const pass = require('./password.js');
const db = require('./database.js');
const sizes = ['4', '2', '1'];

var globalEmotes = {
    twitchGlobal: [],
    bttvGlobal: [],
    ffzGlobal: []
};
var twitchPicUrl = 'https://static-cdn.jtvnw.net/emoticons/v1/';
var bttvPicUrl = 'https://cdn.betterttv.net/emote/';

class Emote{
    constructor(name, url, origin){
        this.name = name;
        this.url = url;
        this.origin = origin;
    }
}


module.exports = {
    loadEmotes: function(channelObj){
        getFFZChannel(channelObj);
        getBTTVChannel(channelObj);
        //getTwitchChannel(channelObj);
    },  
    loadGlobalEmotes: function(){
        getTwitchGlobal();
        getBTTVGlobal();
        getFFZGlobal();
    },  
    loadTwitchSubEmotes: function(){
        return getTwitchEverything();
    },
    getEmojiURL: function(emoji){
        let emojiUrl = 'https://twemoji.maxcdn.com/v/latest/72x72/';
        if (emoji.length < 4)
            return emojiUrl + emoji.codePointAt(0).toString(16) + '.png';
        return emojiUrl + emoji.codePointAt(0).toString(16) + '-' + emoji.codePointAt(2).toString(16) + '.png';
    },
    createNewEmote: function(name, url, origin){
        return new Emote(name, url, origin);
    },
    globalEmotes: globalEmotes
};



function getJsonProm(url, callback){
    return fetch(url)
        .then((response) => { 
            return response.json();
        })
        .then((data) => {
            callback(data);
        });
}





function getFFZChannel(channelObj){
   let ffzChannel = 'https://api.frankerfacez.com/v1/room/' + channelObj.name.substring(1); 
   
   getJsonProm(ffzChannel, function(ffzChObj){
       if (ffzChObj.hasOwnProperty("error")){
           return;
       }
       let emoteList = ffzChObj['sets'][ffzChObj['room']['set']]['emoticons'];
       console.log("ffzChannel in " + channelObj.name + " loaded!");
       channelObj.emotes.ffzChannel = convertFFZLists(emoteList);
   });
}

function getFFZGlobal(){
    let ffzGlobal = 'https://api.frankerfacez.com/v1/set/global';
    
    getJsonProm(ffzGlobal, function(ffzGlObj){
        let emoteList = ffzGlObj['sets']['3']['emoticons'].concat(ffzGlObj['sets']['4330']['emoticons']);
        globalEmotes.ffzGlobal = convertFFZLists(emoteList);
        console.log("ffzglobal loaded!");
    });
}





function getBTTVChannel(channelObj){
    let bttvChannel = 'https://api.betterttv.net/2/channels/' + channelObj.name.substring(1);
    
    getJsonProm(bttvChannel, function(bttvChObj){
        if (bttvChObj.hasOwnProperty("message") && bttvChObj['message'] === "channel not found"){
            return;
        }
        
        let emoteList = bttvChObj['emotes'];
        console.log("bttvchannel in " + channelObj.name + " loaded!");
        channelObj.emotes.bttvChannel = convertBTTVAndTwitchLists(emoteList, bttvPicUrl, '/3x');
    });
}

function getBTTVGlobal(){
    let bttvGlobal = 'https://api.betterttv.net/2/emotes';
    
    getJsonProm(bttvGlobal, function(bttvGlObj){
        let emoteList = bttvGlObj['emotes'];
        globalEmotes.bttvGlobal = convertBTTVAndTwitchLists(emoteList, bttvPicUrl, '/2x');
        console.log("bttvglobal loaded!");
    });
}





function getTwitchChannel(channelObj){
    let twitchUserUrl = 'https://api.twitch.tv/helix/users?login=';
    fetch(twitchUserUrl + channelObj.name.substring(1), {
        headers: {
            'Authorization': 'Bearer ' + pass.authToken,
            'Client-ID': pass.clientId
        }
    })
    .then((response) => {
        return response.json();
    })
    .then((dataObj) => {
        let twitchEmotesUrl = 'https://api.twitchemotes.com/api/v4/channels/' + dataObj.data[0].id;

        getJsonProm(twitchEmotesUrl, function(twChObj){
            if(twChObj.hasOwnProperty("error")){
                return;
            }
            
            let emoteList = twChObj['emotes'];
            console.log("twitchchannel in " + channelObj.name + " loaded!");
            channelObj.emotes.twitchChannel = convertBTTVAndTwitchLists(emoteList, twitchPicUrl, '/2.0');
        });
     });
}

function getTwitchGlobal(){
    let twitchGlobalUrl = 'https://api.twitchemotes.com/api/v4/channels/0';
    
    return getJsonProm(twitchGlobalUrl, function(twGlObj){
        let emoteList = twGlObj['emotes'].filter(emote => emote.id > 14);
        globalEmotes.twitchGlobal = convertBTTVAndTwitchLists(emoteList, twitchPicUrl, '/2.0');
        console.log("twitchglobal loaded!");
    });
}

function getTwitchEverything(){
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
            return;
        }
        
        const lastEmoteID = await db.getLastEmoteID();
        if (lastEmoteID === -1){
            return;
        }
        let emoteList = dataObj['emoticons'].filter(emote => emote['id'] > lastEmoteID);
        console.log('emote data loaded');
        (async function(){
            //db.sendQuery('PRAGMA cache_size=10000;');
            db.sendQuery('BEGIN TRANSACTION;');
            for (i=0; i<emoteList.length; i++){
                await db.insertEmote(emoteList[i]['id'], emoteList[i]['regex'], emoteList[i]['images']['url'].replace('1.0', '3.0'));
            }
            db.sendQuery('END TRANSACTION;');
            console.log("up to " + emoteList.length + " new emotes added!");
        })();
        module.exports.allExisitingEmotes = emoteList;
        return "done";
    });
}

function startEmoteSchedule(){
    var rule = new schedule.RecurrenceRule();
    rule.hour = [0,12];
    rule.minute = 0;
    rule.second = 0;
 
    var j = schedule.scheduleJob(rule, function(){
        getTwitchEverything();
    });
}
startEmoteSchedule();


function convertBTTVAndTwitchLists(emoteList, url, postfix){
    for (i=0; i<emoteList.length; i++){
        let emoteUrl = url + emoteList[i]['id'] + postfix;
        let origin;
        if (new RegExp(".*betterttv.*").test(url)){
            origin = 'bttv';
        } else {
            origin = 'twitch';
        }
        emoteList[i] = new Emote(emoteList[i]['code'].replace('\\&lt', '<').replace('\\&rt', '>'), emoteUrl, origin);
    }
    return emoteList;
}

function convertFFZLists(emoteList){
    for (i=0; i<emoteList.length; i++){
        for (const size of sizes){
            if (emoteList[i]['urls'].hasOwnProperty(size)){
                emoteList[i] = new Emote(emoteList[i]['name'], 'https:'+emoteList[i]['urls'][size], 'ffz');
                break;
            }
        }
    }
    return emoteList;
}
