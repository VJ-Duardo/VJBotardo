const fetch = require("node-fetch");
const schedule = require('node-schedule');
const cp = require("child_process");
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
    globalEmotes: globalEmotes,
    getFFZEmoteStat: getFFZEmoteStat,
    getRandomFFZEmote: getRandomFFZEmote,
    getBTTVEmoteStat: getBTTVEmoteStat,
    getRandomBTTVEmote: getRandomBTTVEmote
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
   let ffzChannel = `https://api.frankerfacez.com/v1/room/${channelObj.name}`; 
   
   getJsonProm(ffzChannel, function(ffzChObj){
       if (ffzChObj.hasOwnProperty("error")){
           return;
       }
       let emoteList = ffzChObj['sets'][ffzChObj['room']['set']]['emoticons'];
       console.log(`ffzChannel in ${channelObj.name} loaded!`);
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

async function getFFZEmoteStat(keyword){
    const ffzApi = `https://api.frankerfacez.com/v1/emoticons?_sceheme=https&per_page=1&q=${keyword}`;
    let response = await fetch(ffzApi);
    let data = await response.json();
    return !data.hasOwnProperty('error') ? parseInt(data['_total']) : 0;
}

async function getRandomFFZEmote(keyword){
    const pages = await getFFZEmoteStat(keyword);
    if (pages === 0)
        return -1;
    const ffzApi = `https://api.frankerfacez.com/v1/emoticons?_sceheme=https&per_page=1&page=${Math.ceil(Math.random() * pages)}&q=*${keyword}%`;
    let response = await fetch(ffzApi);
    let data = await response.json();
    return !data.hasOwnProperty('error') ? convertFFZLists([data['emoticons'][0]])[0] : -1;
}

function getBTTVChannel(channelObj){
    let bttvChannel = `https://api.betterttv.net/2/channels/${channelObj.name}`;
    
    getJsonProm(bttvChannel, function(bttvChObj){
        if (bttvChObj.hasOwnProperty("message") && bttvChObj['message'] === "channel not found"){
            return;
        }
        
        let emoteList = bttvChObj['emotes'];
        console.log(`bttvchannel in ${channelObj.name} loaded!`);
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

async function getBTTVEmoteStat(keyword){
    if (keyword == '' || keyword.length < 3){
        return 0;
    }
    const queryApi = `https://api.betterttv.net/3/emotes/shared/search?query=${keyword}&offset=0&limit=100`;
    let data = await (await fetch(queryApi)).json();
    return data.hasOwnProperty("message") ? 0 : data.length;
}

async function getRandomBTTVEmote(keyword){
    if (keyword === ''){
        const maxOffset = 4000;
        const bttvTrendingApi = `https://api.betterttv.net/3/emotes/shared/trending?offset=${Math.floor(Math.random() * maxOffset+1)}&limit=1`;
        let data = await (await fetch(bttvTrendingApi)).json();
        return data.length > 0 && !data.hasOwnProperty("message") ? convertBTTVAndTwitchLists([data[0].emote], bttvPicUrl, '/3x')[0] : -1;
    } else {
        const count = await getBTTVEmoteStat(keyword);
        if (count === 0){
            return -1;
        }
        const queryApi = `https://api.betterttv.net/3/emotes/shared/search?query=${keyword}&offset=${Math.floor(Math.random() * count)}&limit=1`;
        let data = await (await fetch(queryApi)).json();
        return data.length > 0 && !data.hasOwnProperty("message") ? convertBTTVAndTwitchLists(data, bttvPicUrl, '/3x')[0] : -1;
    }
}
/*
function getTwitchChannel(channelObj){
    let twitchUserUrl = 'https://api.twitch.tv/helix/users?login=';
    fetch(twitchUserUrl + channelObj.name, {
        headers: {
            'Authorization': `Bearer ${pass.authToken}`,
            'Client-ID': pass.clientId
        }
    })
    .then((response) => {
        return response.json();
    })
    .then((dataObj) => {
        let twitchEmotesUrl = `https://api.twitchemotes.com/api/v4/channels/${dataObj.data[0].id}`;

        getJsonProm(twitchEmotesUrl, function(twChObj){
            if(twChObj.hasOwnProperty("error")){
                return;
            }
            
            let emoteList = twChObj['emotes'];
            console.log(`twitchchannel in ${channelObj.name} loaded!`);
            channelObj.emotes.twitchChannel = convertBTTVAndTwitchLists(emoteList, twitchPicUrl, '/2.0');
        });
     });
}
*/
function getTwitchGlobal(){
    let twitchGlobalUrl = 'https://api.twitchemotes.com/api/v4/channels/0';
    
    return getJsonProm(twitchGlobalUrl, function(twGlObj){
        let emoteList = twGlObj['emotes'].filter(emote => emote.id > 14);
        globalEmotes.twitchGlobal = convertBTTVAndTwitchLists(emoteList, twitchPicUrl, '/2.0');
        console.log("twitchglobal loaded!");
    });
}

function getTwitchEverything(){
    return new Promise(function(resolve){
        var child = cp.fork('./subemotes.js');

        child.on('message', function(m) {
          resolve(m);
          child.disconnect();
        });

        child.send("getTwitchEverything");
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
            if (emoteList[i]['urls'].hasOwnProperty(size) && emoteList[i]['urls'][size] !== null){
                emoteList[i] = new Emote(emoteList[i]['name'], 'https:'+emoteList[i]['urls'][size], 'ffz');
                break;
            }
        }
    }
    return emoteList;
}
