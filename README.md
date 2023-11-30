# VJBotardo

A twitch.tv chat bot  
[__View current commands__](https://gist.github.com/VJ-Duardo/ee90088cb8b8aeec623a6092eaaa38bb)  

## Used API's and Services
* [Twitch Emotes](https://twitchemotes.com/apidocs)
* [BetterTTV](https://betterttv.com/)
* [FrankerFaceZ](https://frankerfacez.com/developers)
* [Twitter Emoji (Twemoji)](https://github.com/twitter/twemoji)
* [Supinic](https://supinic.com/api/)

## How to run the bot
1. [Install nodejs](https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions)
2. Install yarn: `npm install --global yarn`
3. Git clone the repo
4. Get the dependencies: `yarn`
5. Copy the `password.example.js` file and rename to `password.js`, then input your credentials
6. Create a sqlite3 database.db with the required [tables](https://gist.github.com/VJ-Duardo/f605e10c8063d34f5169d02fd640f70c)
7. Run the bot: `yarn node botardo.js`
