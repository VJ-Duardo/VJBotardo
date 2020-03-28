const fetch = require("node-fetch");
const pass = require('./password.js');
const sizes = ['4', '2', '1'];

var twitchGlobalEmotes = [];
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
        /*getFFZChannel(channelObj);
        getFFZGlobal(channelObj);
        getBTTVChannel(channelObj);
        getBTTVGlobal(channelObj);
        getTwitchChannel(channelObj);
        
        if (twitchGlobalEmotes.length > 0){
            channelObj.twitchGlobal = twitchGlobalEmotes;
            console.log("twitchglobal in " + channelObj.name + " loaded!!");
        } else {
            getTwitchGlobal(channelObj);
        }*/
    }
};



function getJsonProm(url, callback){
    fetch(url)
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

function getFFZGlobal(channelObj){
    let ffzGlobal = 'https://api.frankerfacez.com/v1/set/global';
    
    getJsonProm(ffzGlobal, function(ffzGlObj){
        let emoteList = ffzGlObj['sets']['3']['emoticons'].concat(ffzGlObj['sets']['4330']['emoticons']);
        console.log("ffzGlobal in " + channelObj.name + " loaded!");
        channelObj.emotes.ffzGlobal = convertFFZLists(emoteList);
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
        channelObj.emotes.bttvChannel = convertBTTVAndTwitchLists(emoteList, bttvPicUrl, '/2x');
    });
}

function getBTTVGlobal(channelObj){
    let bttvGlobal = 'https://api.betterttv.net/2/emotes';
    
    getJsonProm(bttvGlobal, function(bttvGlObj){
        let emoteList = bttvGlObj['emotes'];
        console.log("bttvglobal in " + channelObj.name + " loaded!");
        channelObj.emotes.bttvGlobal = convertBTTVAndTwitchLists(emoteList, bttvPicUrl, '/2x');
    });
}





function getTwitchChannel(channelObj){
    let twitchUserUrl = 'https://api.twitch.tv/helix/users?login=';
    fetch(twitchUserUrl + channelObj.name.substring(1), {
        headers: {
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

function getTwitchGlobal(channelObj){
    let twitchGlobalUrl = 'https://api.twitchemotes.com/api/v4/channels/0';
    
    getJsonProm(twitchGlobalUrl, function(twGlObj){
        let emoteList = twGlObj['emotes'];
        console.log("twitchglobal in " + channelObj.name + " loaded!");
        channelObj.emotes.twitchGlobal = convertBTTVAndTwitchLists(emoteList, twitchPicUrl, '/2.0');
    });
}




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
