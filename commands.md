# Commands
__Default Prefix: !__

<br>

* __!setBot__ \<option\> \<value\>  
Used for bot settings in the current channel. *e.g. !setBot modsCanEdit true*  
Available options:  

| option | description | value | needed privileges |
| -- | -- | -- | -- |
| modsCanEdit | Allows moderators to edit bot and command settings. Moderators cannot edit the following options if *false*. | true/false | dev, broadcaster |
| prefix | Sets the command prefix. The commands ping and bot always work with *!* too to check the current prefix. | a-zA-Z0-9^!?"'#$%&()[]{}=+\*~\-\_,;@<>° 1-20 characters | dev, broadcaster, mod(!)|
| whileLive | Bot wont be responsive while the channel is live if *true*. | true/false | dev, broadcaster, mod(!) |
| gifSpam | Will stop !ascii of printing a gif in multiple frames if *false*. | true/false | dev, broadcaster, mod(!) |  

* __!checkBot__  
Shows the current bot settings in this channel.

<br>

* __!setCommand__ \<command\> \<option\> \<value\>  
Sets options for commands in the current channel. *e.g. !setCommand ascii cooldown 10*  
Availabe options:  

| option | description | value | needed privileges |
| -- | -- | -- | -- |
| cooldown | The cooldown in seconds until a command can be used again. Every command has a minimum and maximum allowed cooldown, which can be seen once a wrong value has been entered. | Number in the allowed range. | dev, broadcaster, mod(!) |
| enabled | Disables a command in the current channel if *false*. | true/false | dev, broadcaster, mod(!) |

* __!checkCommand__ \<command\>  
Shows the current settings for that command.

<br>

* __!bot__  
Information about the bot.
  
* __!commands__  
Links to the command list.

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
Starts a game of "*Guess the emote!*". The mode determines the emotes in the play set. Possible modes are *channel*, *global*, *all* and *origin*.  The default and minimum amount of rounds is one, the maximum being 20.   
Mode *origin* presents emote descriptions from Supibots *$origin* command. 

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

* __!stack__ \<emote\>|\<emoji\>|\<link\>  \<emote\>|\<emoji\>|\<link\>    
Creates and prints a single braille string with the two provided pictures on top of each other.

* __!mix__ \<emote\>|\<emoji\>|\<link\>  \<emote\>|\<emoji\>|\<link\>    
Takes the upper half of the first and the lower half of the second image and puts them together into one braille string.

* __!mirror__ \<emote\>|\<emoji\>|\<link\>    
Puts the first half next to its mirrored version.

* __!antimirror__ \<emote\>|\<emoji\>|\<link\>    
Puts the mirrored second half next to its mirrored version.
