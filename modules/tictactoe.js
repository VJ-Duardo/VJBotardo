const fetch = require("node-fetch");
const db = require("./database.js");
const brailleData = require("./brailledata.js");
const ascii = require("./ascii.js");
const emotes = require("./emotes.js");

const postDelay = 200;

var games = {};
var defaultCharacters = ["x", "o"];
const timeToStart = 500;
const reward = 50;
const consolationReward = 15;

class Game {
  constructor(channel, sayFunc, player1, player1ID, player1Character, player2) {
    this.channel = channel;
    this.playerOne = {
      name: player1,
      id: player1ID,
      character: player1Character,
    };
    this.playerTwo = {
      name: player2,
      id: null,
      character: "o",
    };
    this.waitForAccept = {
      status: false,
      handle: null,
      waitTime: 30000,
    };
    this.waitForInput = {
      status: false,
      handle: null,
      waitTime: 30000,
    };
    this.nextRoundTimeout = {
      handle: null,
      waitTime: 3000,
    };
    this.sayFunc = sayFunc;
    this.turn;
    this.field = {
      tl: "-",
      t: "-",
      tr: "-",
      ml: "-",
      m: "-",
      mr: "-",
      bl: "-",
      b: "-",
      br: "-",
    };
    this.looks = {
      "-": brailleData.ttt["-"].split(" "),
      vertLine: brailleData.ttt.vertLine,
      cellHeight: 5,
    };
    this.winner;
    this.loser;
    this.gameStarted = false;
    this.fieldTakenCooldown = 0;
    this.fieldTakenCooldownTime = 2;
  }

  randomStartTurn() {
    this.turn = [this.playerOne, this.playerTwo][Math.floor(Math.random() * 2)];
  }

  setDefaultLooks(player, index) {
    player.character = defaultCharacters[index];
    this.looks[player.character] = brailleData.ttt[player.character].split(" ");
  }

  getPlayerByAttribute(attr, value) {
    if (this.playerOne[attr] === value) {
      return this.playerOne;
    } else if (this.playerTwo[attr] === value) {
      return this.playerTwo;
    } else {
      return;
    }
  }

  getOtherPlayer(player) {
    if (player === this.playerOne) {
      return this.playerTwo;
    } else {
      return this.playerOne;
    }
  }

  turnToString() {
    let fieldString = "";
    let fieldArr = Object.values(this.field);
    for (let i = 0; i < fieldArr.length; i += 3) {
      for (let j = 0; j < this.looks.cellHeight; j++) {
        fieldString +=
          [
            this.looks[fieldArr[i]][j],
            this.looks[fieldArr[i + 1]][j],
            this.looks[fieldArr[i + 2]][j],
          ].join(this.looks.vertLine) + " ";
      }
    }
    return fieldString;
  }

  getEmptyCells() {
    let emptyList = [];
    for (let cell in this.field) {
      if (this.field[cell] === "-") {
        emptyList.push(cell);
      }
    }
    return emptyList;
  }

  setRandomCell(character) {
    let emptyCells = this.getEmptyCells();
    let randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    if (this.field[randomCell] !== "-") {
      this.setRandomCell(character);
    } else {
      this.field[randomCell] = character;
    }
  }

  checkIfGameOver() {
    let character;
    let fieldArr = Object.values(this.field);
    function checkCharacterLine(character, pos, posOffSet) {
      if (
        character !== "-" &&
        fieldArr[pos + posOffSet * 1] === character &&
        fieldArr[pos + posOffSet * 2] === character
      ) {
        return true;
      } else {
        return false;
      }
    }
    for (let i = 0; i < fieldArr.length; i += 3) {
      character = fieldArr[i];
      if (checkCharacterLine(character, i, 1)) {
        this.winner = this.getPlayerByAttribute("character", character);
      }
    }
    for (let j = 0; j < 3; j++) {
      character = fieldArr[j];
      if (checkCharacterLine(character, j, 3)) {
        this.winner = this.getPlayerByAttribute("character", character);
      }
    }
    character = fieldArr[0];
    if (checkCharacterLine(character, 0, 4)) {
      this.winner = this.getPlayerByAttribute("character", character);
    }
    character = fieldArr[2];
    if (checkCharacterLine(character, 2, 2)) {
      this.winner = this.getPlayerByAttribute("character", character);
    }

    if (this.getEmptyCells().length === 0 && typeof this.winner === "undefined") {
      return 0;
    } else if (typeof this.winner !== "undefined") {
      this.loser = this.getOtherPlayer(this.winner);
      return 1;
    } else {
      return -1;
    }
  }
}

module.exports = {
  tictactoe: async function (channelObj, sayFunc, user, command) {
    if (getGameState(channelObj.name) && command[0] === channelObj.prefix + "concede") {
      let gameObj = games[channelObj.name];
      if (gameObj.gameStarted) {
        clearTimeout(gameObj.waitForInput.handle);
        clearTimeout(gameObj.nextRoundTimeout.handle);
        gameObj.loser = gameObj.getPlayerByAttribute("name", user["username"].toLowerCase());
        gameObj.winner = gameObj.getOtherPlayer(gameObj.loser);
        await sayFunc(channelObj.name, `/me ${user["username"]} has given up :/`);
        settleGameEnd(channelObj, gameObj, 1);
      } else {
        clearTimeout(gameObj.waitForAccept.handle);
        sayFunc(channelObj.name, `/me ${user["username"]} Does not want to play :(`);
        endGame(channelObj);
      }
      return;
    }

    if (!getGameState(channelObj.name)) {
      if (typeof command[1] === "undefined") {
        sayFunc(
          channelObj.name,
          `/me Correct syntax is: ${channelObj.prefix}ttt <enemy> [<emote>]`
        );
        return;
      }
      let newGame = new Game(
        channelObj.name,
        sayFunc,
        user["username"].toLowerCase(),
        user["user-id"],
        command[2],
        command[1].toLowerCase()
      );
      games[channelObj.name] = newGame;
      channelObj.gameRunning = true;
      channelObj.game = module.exports.tictactoe;

      gameRequestTimeout(channelObj, games[channelObj.name], true);
    } else {
      let gameObj = games[channelObj.name];
      if (
        gameObj.waitForAccept.status &&
        command[0] === channelObj.prefix + "accept" &&
        user["username"].toLowerCase() === gameObj.playerTwo.name.toLowerCase()
      ) {
        gameObj.playerTwo.id = user["user-id"];
        gameObj.waitForAccept.status = false;
        clearTimeout(gameObj.waitForAccept.handle);
        gameObj.playerTwo.character = command[1];
        checkCharacters(channelObj, gameObj);
        gameObj.randomStartTurn();
        gameObj.gameStarted = true;
        setTimeout(async function () {
          await gameObj.sayFunc(channelObj.name, gameObj.turnToString());
          await new Promise((resolve) => setTimeout(resolve, postDelay));
          startRound(channelObj, gameObj);
        }, timeToStart);
      } else if (
        gameObj.waitForInput.status &&
        user["username"].toLowerCase() === gameObj.turn.name.toLowerCase() &&
        Object.keys(gameObj.field).includes(command[0].toLowerCase())
      ) {
        if (!gameObj.getEmptyCells().includes(command[0].toLowerCase())) {
          if (Math.round(new Date().getTime() / 1000) > gameObj.fieldTakenCooldown) {
            sayFunc(channelObj.name, "/me That field is already taken!");
            gameObj.fieldTakenCooldown =
              Math.round(new Date().getTime() / 1000) + gameObj.fieldTakenCooldownTime;
          }
          return;
        }

        gameObj.field[command[0].toLowerCase()] = gameObj.turn.character;
        postRoundCheck(channelObj, gameObj);
      }
    }
  },
};

function startRound(channelObj, gameObj) {
  gameObj.sayFunc(
    channelObj.name,
    `/me It's ${gameObj.turn.name}'s ( ${
      gameObj.turn.character
    } ) turn! Options: (${gameObj.getEmptyCells()})`
  );

  gameObj.waitForInput.status = true;
  gameObj.waitForInput.handle = setTimeout(function () {
    gameTurnTimeout(channelObj, gameObj);
  }, gameObj.waitForInput.waitTime);
}

async function settleGameEnd(channelObj, gameObj, result) {
  await new Promise((resolve) => setTimeout(resolve, postDelay));
  if (result === 0) {
    gameObj.sayFunc(
      channelObj.name,
      `/me Tie! Both get a consolation prize of ${consolationReward} USh!`
    );
    db.addUserPoints(gameObj.playerOne.id, gameObj.playerOne.name, consolationReward);
    db.addUserPoints(gameObj.playerTwo.id, gameObj.playerTwo.name, consolationReward);
  } else {
    gameObj.sayFunc(channelObj.name, `/me ${gameObj.winner.name} won! He wins ${reward} USh!`);
    db.addUserPoints(gameObj.winner.id, gameObj.winner.name, reward);
  }
  endGame(channelObj);
}

async function postRoundCheck(channelObj, gameObj) {
  gameObj.waitForInput.status = false;
  clearTimeout(gameObj.waitForInput.handle);
  await new Promise((resolve) => setTimeout(resolve, postDelay));
  await gameObj.sayFunc(channelObj.name, gameObj.turnToString());
  let gameOverStatus = gameObj.checkIfGameOver();
  if (gameOverStatus === -1) {
    gameObj.turn = gameObj.getOtherPlayer(gameObj.turn);
    gameObj.nextRoundTimeout.handle = setTimeout(function () {
      startRound(channelObj, gameObj);
    }, gameObj.nextRoundTimeout.waitTime);
  } else {
    settleGameEnd(channelObj, gameObj, gameOverStatus);
  }
}

async function gameTurnTimeout(channelObj, gameObj) {
  await gameObj.sayFunc(
    channelObj.name,
    `/me ${gameObj.turn.name} did not complete his turn in time. A random move was done! :Z`
  );
  gameObj.setRandomCell(gameObj.turn.character);
  postRoundCheck(channelObj, gameObj);
}

function gameRequestTimeout(channelObj, gameObj, initial) {
  if (initial) {
    gameObj.sayFunc(
      channelObj.name,
      `/me ${gameObj.playerTwo.name}, ${gameObj.playerOne.name} wants to play a game of tictactoe! Write ${channelObj.prefix}accept [<emote>] to play :)`
    );
    gameObj.waitForAccept.handle = setTimeout(function () {
      gameRequestTimeout(channelObj, gameObj, false);
    }, gameObj.waitForAccept.waitTime);
    gameObj.waitForAccept.status = true;
  } else {
    gameObj.sayFunc(
      channelObj.name,
      `/me ${gameObj.playerTwo.name} did not accept the request in time!`
    );
    endGame(channelObj);
  }
}

function checkCharacters(channelObj, gameObj) {
  if (gameObj.playerOne.character === gameObj.playerTwo.character)
    gameObj.playerTwo.character = undefined;

  [gameObj.playerOne, gameObj.playerTwo].forEach(async function (player, i) {
    if (typeof player.character === "undefined") {
      gameObj.setDefaultLooks(player, i);
      return;
    }

    let emote = [].concat
      .apply([], Object.values(channelObj.emotes).concat(Object.values(emotes.globalEmotes)))
      .find((emote) => emote.name === player.character);
    if (typeof emote === "undefined") {
      emote = await db.getEmoteByName(player.character);
      if (emote === -1) {
        emote = emotes.createNewEmote(
          player.character,
          emotes.getEmojiURL(player.character),
          "emoji"
        );
      }
    }

    gameObj.setDefaultLooks(player, i);
    ascii
      .ascii("ascii", [emote.url], false, ["-w", "18", "-h", "18", "-tr", "150"], null, null)
      .then((brailleString) => {
        if (brailleString !== -1) {
          player.character = emote.name;
          gameObj.looks[player.character] = brailleString.split(" ");
        }
      });
  });
}

function getGameState(channelName) {
  return games.hasOwnProperty(channelName);
}

function endGame(channelObj) {
  delete games[channelObj.name];
  channelObj.gameRunning = false;
}
