var games = {};


class Game {
    constructor(channel, solution){
        this.channel = channel;
        this.solution = solution;
    }
}


module.exports = {
    getRandomUrl: function(channelObj){
        let randomNumber = Math.floor(Math.random() * channelObj.emotes.bttvChannel.length);
        let emote = channelObj.emotes.bttvChannel[randomNumber];
        
        let newGame = new Game(channelObj.name, emote.name);
        games[channelObj.name] = newGame;
        return emote.url;
    },
    endGame: function(channelName){
        delete games[channelName];
    },
    getGameState: function(channelName){
        return games.hasOwnProperty(channelName);
    },
    getGameSolution: function(channelName){
        return games[channelName].solution;
    } 
};


