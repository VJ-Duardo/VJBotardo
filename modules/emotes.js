const fetch = require("node-fetch");
const schedule = require("node-schedule");
const cp = require("child_process");
const config = require("./../configs/config.js");
const sizes = ["4", "2", "1"];

var globalEmotes = {
  twitchGlobal: [],
  bttvGlobal: [],
  ffzGlobal: [],
  seventvGlobal: [],
};

class Emote {
  constructor(name, url, origin) {
    this.name = name;
    this.url = url;
    this.origin = origin;
  }
}

module.exports = {
  loadEmotes: async function (channelObj) {
    await getFFZChannel(channelObj);
    await getBTTVChannel(channelObj);
    await getTwitchChannel(channelObj);
    await getSevenTvChannel(channelObj);
  },
  loadGlobalEmotes: function () {
    getTwitchGlobal();
    getBTTVGlobal();
    getFFZGlobal();
    getSeventvGlobal();
  },
  getEmojiURL: function (emoji) {
    let emojiUrl = "https://pajbot.com/static/emoji-v2/img/twitter/64/";
    if (emoji.length < 4) return emojiUrl + emoji.codePointAt(0).toString(16) + ".png";
    return (
      emojiUrl +
      emoji.codePointAt(0).toString(16) +
      "-" +
      emoji.codePointAt(2).toString(16) +
      ".png"
    );
  },
  createNewEmote: function (name, url, origin) {
    return new Emote(name, url, origin);
  },
  globalEmotes: globalEmotes,
  getFFZEmoteStat: getFFZEmoteStat,
  getRandomFFZEmote: getRandomFFZEmote,
  getBTTVEmoteStat: getBTTVEmoteStat,
  getRandomBTTVEmote: getRandomBTTVEmote,
  getSeventvEmoteUrl: getSeventvEmoteUrl,
};

function getJsonProm(url, callback, options = {}) {
  return fetch(url, options)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      callback(data);
    });
}

function getFFZChannel(channelObj) {
  let ffzChannel = `https://api.frankerfacez.com/v1/room/${channelObj.name}`;

  return getJsonProm(ffzChannel, function (ffzChObj) {
    if (ffzChObj.hasOwnProperty("error")) {
      return;
    }
    let emoteList = ffzChObj["sets"][ffzChObj["room"]["set"]]["emoticons"];
    console.log(`ffzChannel in ${channelObj.name} loaded!`);
    channelObj.emotes.ffzChannel = convertFFZLists(emoteList);
  });
}

function getFFZGlobal() {
  let ffzGlobal = "https://api.frankerfacez.com/v1/set/global";

  getJsonProm(ffzGlobal, function (ffzGlObj) {
    let emoteList = ffzGlObj["sets"]["3"]["emoticons"].concat(
      ...[ffzGlObj["sets"]["1532818"]["emoticons"], ffzGlObj["sets"]["1539687"]["emoticons"]]
    );
    globalEmotes.ffzGlobal = convertFFZLists(emoteList);
    console.log("ffzglobal loaded!");
  });
}

async function getFFZEmoteStat(keyword) {
  const ffzApi = `https://api.frankerfacez.com/v1/emoticons?_sceheme=https&per_page=1&q=${keyword}`;
  let response = await fetch(ffzApi);
  let data = await response.json();
  return !data.hasOwnProperty("error") ? parseInt(data["_total"]) : 0;
}

async function getRandomFFZEmote(keyword) {
  const pages = await getFFZEmoteStat(keyword);
  if (pages === 0) return -1;
  const ffzApi = `https://api.frankerfacez.com/v1/emoticons?_sceheme=https&per_page=1&page=${Math.ceil(
    Math.random() * pages
  )}&q=*${keyword}%`;
  let response = await fetch(ffzApi);
  let data = await response.json();
  return !data.hasOwnProperty("error") ? convertFFZLists([data["emoticons"][0]])[0] : -1;
}

function getBTTVChannel(channelObj) {
  let bttvChannel = `https://api.betterttv.net/3/cached/users/twitch/${channelObj.id}`;

  return getJsonProm(bttvChannel, function (bttvChObj) {
    if (bttvChObj.hasOwnProperty("message") && bttvChObj["message"] === "user not found") {
      return;
    }

    let emoteList = bttvChObj["channelEmotes"].concat(bttvChObj["sharedEmotes"]);
    console.log(`bttvchannel in ${channelObj.name} loaded!`);
    channelObj.emotes.bttvChannel = convertBTTVLists(emoteList, "/3x");
  });
}

function getBTTVGlobal() {
  let bttvGlobal = "https://api.betterttv.net/3/cached/emotes/global";

  getJsonProm(bttvGlobal, function (bttvGlObj) {
    let emoteList = bttvGlObj;
    globalEmotes.bttvGlobal = convertBTTVLists(emoteList, "/2x");
    console.log("bttvglobal loaded!");
  });
}

async function getBTTVEmoteStat(keyword) {
  if (keyword == "" || keyword.length < 3) {
    return 0;
  }
  const queryApi = `https://api.betterttv.net/3/emotes/shared/search?query=${keyword}&offset=0&limit=100`;
  let data = await (await fetch(queryApi)).json();
  return data.hasOwnProperty("message") ? 0 : data.length;
}

async function getRandomBTTVEmote(keyword) {
  if (keyword === "") {
    const maxOffset = 4000;
    const bttvTrendingApi = `https://api.betterttv.net/3/emotes/shared/trending?offset=${Math.floor(
      Math.random() * maxOffset + 1
    )}&limit=1`;
    let data = await (await fetch(bttvTrendingApi)).json();
    return data.length > 0 && !data.hasOwnProperty("message")
      ? convertBTTVLists([data[0].emote], "/3x")[0]
      : -1;
  } else {
    const count = await getBTTVEmoteStat(keyword);
    if (count === 0) {
      return -1;
    }
    const queryApi = `https://api.betterttv.net/3/emotes/shared/search?query=${keyword}&offset=${Math.floor(
      Math.random() * count
    )}&limit=1`;
    let data = await (await fetch(queryApi)).json();
    return data.length > 0 && !data.hasOwnProperty("message")
      ? convertBTTVLists(data, "/3x")[0]
      : -1;
  }
}

async function getTwitchChannel(channelObj) {
  const twitchEmotesUrl = `https://api.twitch.tv/helix/chat/emotes?broadcaster_id=${channelObj.id}`;

  try {
    channelObj.emotes.twitchChannel = await getTwitchEmotes(twitchEmotesUrl);
    console.log("twitchchannel loaded!");
  } catch (e) {
    console.error(`twitchchannel: ${e}`);
  }
}

async function getTwitchGlobal() {
  const twitchGlobalUrl = "https://api.twitch.tv/helix/chat/emotes/global";

  try {
    globalEmotes.twitchGlobal = await getTwitchEmotes(twitchGlobalUrl);
    console.log("twitchglobal loaded!");
  } catch (e) {
    console.error(`twitchglobal: ${e}`);
  }
}

function getTwitchEmotes(api) {
  return new Promise(function (resolve, reject) {
    getJsonProm(
      api,
      function (twObj) {
        if (twObj.hasOwnProperty("error")) {
          reject(twObj.message);
          return;
        }
        resolve(convertTwitchLists(twObj["data"]).filter((em) => !em.name.includes("\\")));
      },
      {
        headers: {
          Authorization: `Bearer ${config.authToken}`,
          "Client-ID": config.clientID,
        },
      }
    );
  });
}

async function getSeventvGlobal() {
  const response = await fetch("https://7tv.io/v2/emotes/global", {
    headers: { "content-type": "application/json" },
  });
  const json = await response.json();
  for (const i in json) {
    const name = json[i]["name"];
    const url = json[i]["urls"][3][1];
    const correctedUrl = await getSeventvEmoteUrl(url);
    globalEmotes.seventvGlobal.push(new Emote(name, correctedUrl, "7tv"));
  }
  console.log("seventvglobal loaded!");
}

async function getSevenTvChannel(channelObj) {
  const sevenTvChannelAPI = `https://7tv.io/v3/users/twitch/${channelObj.id}`;

  return getJsonProm(
    sevenTvChannelAPI,
    function (sevenTVObj) {
      if (sevenTVObj.hasOwnProperty("error")) {
        return;
      }

      console.log(`seventvchannel in ${channelObj.name} loaded!`);
      channelObj.emotes.seventvChannel = convertSevenTvLists(sevenTVObj["emote_set"]["emotes"]);
    },
    {
      headers: { "content-type": "application/json" },
    }
  );
}

async function getSeventvEmoteUrl(url) {
  // The 7TV REST API v2 doesn't indicate whether the
  // webp file is an animation or not, so I'll
  // ask first for the .gif file, if it fails, I
  // assume it's a png file.
  const dotIndex = url.lastIndexOf(".");
  const strippedUrl = url.substring(0, dotIndex);
  extension = "png";

  //Check if it is an animated emote instead
  const resp = await fetch(strippedUrl + ".gif", { method: "GET" });
  if (resp.status === 200) {
    extension = "gif";
  }
  return strippedUrl + "." + extension;
}

function convertBTTVLists(emoteList, postfix) {
  const bttvPicUrl = "https://cdn.betterttv.net/emote/";
  for (i = 0; i < emoteList.length; i++) {
    let emoteUrl = bttvPicUrl + emoteList[i]["id"] + postfix;
    emoteList[i] = new Emote(emoteList[i]["code"], emoteUrl, "bttv");
  }
  return emoteList;
}

function convertTwitchLists(emoteList) {
  for (i = 0; i < emoteList.length; i++) {
    emoteList[i] = new Emote(emoteList[i]["name"], emoteList[i]["images"]["url_4x"], "twitch");
  }
  return emoteList;
}

function convertFFZLists(emoteList) {
  for (i = 0; i < emoteList.length; i++) {
    for (const size of sizes) {
      if (emoteList[i]["urls"].hasOwnProperty(size) && emoteList[i]["urls"][size] !== null) {
        emoteList[i] = new Emote(emoteList[i]["name"], emoteList[i]["urls"][size], "ffz");
        break;
      }
    }
  }
  return emoteList;
}

function convertSevenTvLists(emoteList) {
  if (!emoteList) {
    return [];
  }
  for (i = 0; i < emoteList.length; i++) {
    let isAnimated = emoteList[i]["data"]["animated"];
    emoteList[i] = new Emote(
      emoteList[i]["name"],
      `https:${emoteList[i]["data"]["host"]["url"]}/3x.${isAnimated ? "gif" : "png"}`,
      "7tv"
    );
  }
  return emoteList;
}
