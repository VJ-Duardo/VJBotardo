# Commands

* __!bot__  
  Information about the bot.

* __!ping__  
Pings the server and returns the response time.

* __!ush__ [username]  
Shows your own or optionally someone elses amount of USh.

* __!top__  
Returns the top 5 users with the most USh.

* __!reload__  
Reloads the channel emotes in the channel the command got called from. Does not reload all twitch sub emotes. Cooldown of 10 minutes.

<br>

### Games

* __!guess__ \<mode\> [\<rounds\>]  
Starts a game of "*Guess the emote!*". The mode determines the emotes in the play set. Possible modes are *channel*, *global* and *all*.  The default and minimum amount of rounds is one, the maximum being 20. 

* __!guess stop__  
Ends a "*Guess the emote!*" game after the current round has finished.

<br>

* __!ttt__ \<user\> \<points\> [\<emote\>]  
Sends an invite to the provided user to play a game of tictactoe. Command will fail if user is not in chat or if either players dont have enough USh. Optional emote parameter sets the appearance of the player on the field. Default appearances are *x* and *o*.

* __!accept__ [\<emote\>]  
Accept an invite for a game of ttt. The accepting player can set his appearance at this point.

* __!concede__  
Give up the current game. Doing this before the game was accepted is not counted as a loss.

<br>

### Braille Art ("ascii")

* __!ascii__ \<emote\>|\<emoji\>|\<link\>  
Generates a braille string from the provided emote, emoji or link.

* __!ra__   
Generates a random braille string and prints it to chat. (Excludes emojis)

* __!merge__ \<emote\>|\<emoji\>|\<link\>  \<emote\>|\<emoji\>|\<link\>    
Creates and prints a single braille string with the two provided pictures next to each other. Fails if one of the two pictures is invalid.
