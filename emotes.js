const fetch = require("node-fetch");
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const sizes = ['4', '2', '1'];

class Emote{
    constructor(name, url){
        this.name = name;
        this.url = url;
    }
}


module.exports = {
    loadEmotes: function(channelObj){
        getFFZChannel(channelObj);
        getFFZGlobal(channelObj);
        getBTTVChannel(channelObj);
        getBTTVGlobal(channelObj);
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
        let emoteList = ffzGlObj['sets']['3']['emoticons'].concat(ffzGlObj['sets']['4330']['emoticons'])
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
        channelObj.emotes.bttvChannel = convertBTTVLists(emoteList);
    });
}

function getBTTVGlobal(channelObj){
    let bttvGlobal = 'https://api.betterttv.net/2/emotes';
    
    getJsonProm(bttvGlobal, function(bttvGlObj){
        let emoteList = bttvGlObj['emotes'];
        console.log("bttvglobal in " + channelObj.name + " loaded!");
        channelObj.emotes.bttvGlobal = convertBTTVLists(emoteList);
    });
}



function convertBTTVLists(emoteList){
    let bttvPicUrl = 'https://cdn.betterttv.net/emote/';
    
    for (i=0; i<emoteList.length; i++){
        let url = bttvPicUrl + emoteList[i]['id']+'/2x';
        emoteList[i] = new Emote(emoteList[i]['code'], url);
    }
    return emoteList;
}

function convertFFZLists(emoteList){
    for (i=0; i<emoteList.length; i++){
        for (const size of sizes){
            if (emoteList[i]['urls'].hasOwnProperty(size)){
                emoteList[i] = new Emote(emoteList[i]['name'], 'https:'+emoteList[i]['urls'][size]);
                break;
            }
        }
    }
    return emoteList;
   
}


function checkImageUrl(url) {
    var http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    if (http.status !== 404){
        return true;
    } else {
        return false;
    }
}