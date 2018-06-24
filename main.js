// Import modules
const { Client } = require('discord.js'),
  fs = require('fs'),
  path = require('path'),
  moment = require('moment'),
  timers = require('./lib/timers.js'),
  staticCommands = require('./lib/static-commands.js'),
  schedule = require('node-schedule'),
  //cooldowns = require('./lib/cooldowns.js'),
  ankhbotCommands = require('./lib/ankhbot-commands.js'),
  config = require('./config.json');
  
var statusentry = ["Mistakes", "Sad Trombone Music", "A Dumpster Fire", "The Robot Uprising", "CTL Championship Circuit", "SCAN NOISES", "Hopes and Dreams"];


// Set up Discord client
const client = new Client();

  client.on('ready', () => {
    console.log(config.botName + ' Online');
   client.setRandomActivity();

    // Update our activity to something random every hour
   schedule.scheduleJob({minute: 0}, () => {
     client.setRandomActivity();
    });
  });

const talkedRecently = new Set();

// Set up SFX
const sfxFilePath = path.join(__dirname, 'sfx');
const allowedSfxChannels = new RegExp(config.allowedSfxChannels);
let playOptions = {volume: config.sfxVolume, passes: config.passes};
let playing = false;

// Read in sfx directory, filenames are the commands
let sfxList = readSfxDirectory(sfxFilePath);
// Watch directory for changes and update the list
fs.watch(sfxFilePath, (eventType, filename) => {
  if (eventType === 'rename') {
    sfxList = readSfxDirectory(sfxFilePath);
  }
});

// @todo DRY this shit up

// Read in fun facts
const funFactsFilePath = path.join(__dirname, 'conf', 'funfacts');
let funFacts = parseLines(funFactsFilePath);
fs.watchFile(funFactsFilePath, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    funFacts = parseLines(funFactsFilePath);
  }
});

// Read in quotes
const quotesFilePath = path.join(__dirname, 'conf', 'quotes');
let quotes = parseLines(quotesFilePath);
fs.watchFile(quotesFilePath, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    quotes = parseLines(quotesFilePath);
  }
});

// Read in ham facts
//const hamFactsFilePath = path.join(__dirname, 'conf', 'hamfacts');
//let hamFacts = parseLines(hamFactsFilePath);
//fs.watchFile(hamFactsFilePath, (curr, prev) => {
//  if (curr.mtime !== prev.mtime) {
    //hamFacts = parseLines(hamFactsFilePath);
  //}
//});

// Set up the native commands to handle
const commands = {
  'sfx': (msg, disconnectAfter) => {
	  
    if (!allowedSfxChannels.test(msg.channel.name)) return;
    let sfx = msg.content.split(' ')[1];
    if (sfx == '' || sfx === undefined) return msg.channel.send('```'+sfxList.join(', ')+'```');

    if (playing === true) return msg.channel.send('Already playing, please wait.');

    // make sure this file exists either as an mp3 or wav
    let sfxPath;
    if (fs.existsSync(path.join(sfxFilePath, sfx + '.mp3'))) {
      sfxPath = path.join(sfxFilePath, sfx + '.mp3');
    } else if (fs.existsSync(path.join(sfxFilePath, sfx + '.wav'))) {
      sfxPath = path.join(sfxFilePath, sfx + '.wav');
    } else {
      return msg.reply('This sound effect does not exist!');
    }

    if (!msg.guild.voiceConnection) return joinVoiceChannel(msg).then(() => commands.sfx(msg, disconnectAfter));

    disconnectAfter = (typeof disconnectAfter !== "undefined") ? disconnectAfter : true;

    playing = true;
    (function play(sfxFile) {
      const dispatcher = msg.guild.voiceConnection.playFile(sfxFile, playOptions);
      dispatcher.on('end', reason => {
        playing = false;
        if (disconnectAfter) msg.guild.voiceConnection.disconnect();
      })
      .on('error', error => {
        playing = false;
        if (disconnectAfter) msg.guild.voiceConnection.disconnect();
      })
      .on('start', () => {});
    })(sfxPath);
  },
  'funfact': (msg) => {
	    if (talkedRecently.has(msg.author.id)) {
            msg.channel.send("You have wait a few more seconds, " + msg.author);
    } else {
    if (funFacts.length > 0) {
      // return random element from funFacts, unless one is specifically requested
      let el;
      let req = parseInt(msg.content.split(' ')[1]);
      if (Number.isNaN(req) || typeof funFacts[req-1] === 'undefined') {
        el = Math.floor(Math.random() * funFacts.length);
      } else {
        el = req - 1;
      }

      let displayNum = (el+1).toString();
      let funFact = funFacts[el]
      msg.channel.send({embed: {
        "title": "FunFact #"+displayNum,
        "color": 0x21c629,
        "description": funFact
      }}).catch(console.error);
    } else {
      msg.channel.send("No fun facts found!");
    }
	 // Adds the user to the set so that they can't talk for a minute
        talkedRecently.add(msg.author.id);
        setTimeout(() => {
          // Removes the user from the set after a minute
          talkedRecently.delete(msg.author.id);
        }, 20000);
    }
  },
    'quote': (msg) => {
		if (talkedRecently.has(msg.author.id)) {
            msg.channel.send("You have wait a few more seconds, " + msg.author);
    } else {
    if (quotes.length > 0) {
      // return random element from quotes, unless one is specifically requested
      let el;
      let req = parseInt(msg.content.split(' ')[1]);
      if (Number.isNaN(req) || typeof quotes[req-1] === 'undefined') {
        el = Math.floor(Math.random() * quotes.length);
      } else {
        el = req - 1;
      }

      let displayNum = (el+1).toString();
      let quote = quotes[el]
      msg.channel.send({embed: {
        "title": "Quote #"+displayNum,
        "color": 0x21c629,
        "description": quote
      }}).catch(console.error);
    } else {
      msg.channel.send("No quotes found!");
    }
		 // Adds the user to the set so that they can't talk for a minute
        talkedRecently.add(msg.author.id);
        setTimeout(() => {
          // Removes the user from the set after a minute
          talkedRecently.delete(msg.author.id);
        }, 20000);
    }
  },
  //'hamfact': (msg) => {
  //  if (hamFacts.length > 0) {
      // return random element from hamFacts, unless one is specifically requested
  //    let el;
  //    let req = parseInt(msg.content.split(' ')[1]);
  //    if (Number.isNaN(req) || typeof hamFacts[req-1] === 'undefined') {
  //      el = Math.floor(Math.random() * hamFacts.length);
  //    } else {
  //      el = req - 1;
  //    }

  //    let displayNum = (el+1).toString();
  //    let hamFact = hamFacts[el]
  //    msg.channel.send({embed: {
  //      "title": "HamFact #"+displayNum,
  //      "color": 0x21c629,
  //      "description": hamFact
  //    }}).catch(console.error);
  //  } else {
  //    msg.channel.send("No ham facts found!");
  //  }
 // },
  //'dance': (msg) => {
  //  msg.channel.send("*┏(-_-)┓┏(-_-)┛┗(-_- )┓┗(-_-)┛┏(-_-)┛ ┏(-_-)┓┏(-_-)┛┗(-_- )┓┗(-_-)┛┏(-_-)┛┏(-_-)┓┏(-_-)┛┗(-_- )┓┗(-_-)┛┏(-_-)┛ ┏(-_-)┓┏(-_-)┛┗(-_- )┓┗(-_-)┛┏(-_-)┛┏(-_-)┓┏(-_-)┛┗(-_- )┓┗(-_-)┛┏(-_-)┛ ┏(-_-)┓┏(-_-)┛┗(-_- )┓┗(-_-)┛┏(-_-)┛*");
//  },
  'join': (msg) => {
    if (!msg.guild.voiceConnection) { 
      joinVoiceChannel(msg).then(() => {
        //
      }).catch(console.error);
    } else {
      return msg.reply(`I'm already in a voice channel!`);
    }
  },
   
  'leave': (msg) => {
    if (msg.guild.voiceConnection) { 
      msg.content = '!sfx bye';
      commands.sfx(msg);
      //msg.guild.voiceConnection.disconnect();
    } else {
      return msg.reply(`If ya don't eat your meat, ya can't have any pudding!`);
    }
  },
  'rftw': (msg, suffix) => {
	  let search = msg.content.split(' ')[1];
	  msg.channel.send('http://rankedftw.com/search/?name=' + search);
  },
  
    'unmask': (msg, suffix) => {
	  let search = msg.content.split(' ')[1];
	  msg.channel.send('http://sc2unmasked.com/Search?q=' + search);
  },
    
  'listen': (msg) => {
    // listen for a particular member to speak and respond appropriately
    if (msg.guild.voiceConnection) {
      // get the guild member
      //let guildMemberId = "88301001169207296"; // me
      let guildMemberId = "153563292265086977"; // Screevo
      let guildMember = msg.guild.members.get(guildMemberId);
      if (guildMember) {
        let listenInterval = 1000;
        setInterval(() => {
          if (guildMember.speaking === true) {
            msg.content = '!sfx stfu';
            commands.sfx(msg, false);
          }
        }, listenInterval);
      } else {
        console.error(`Could not find specified guild member: ${guildMemberId}!`);
        msg.guild.voiceConnection.disconnect();
      }
    } else {
      // join the voice channel then call this command again
      joinVoiceChannel(msg).then(() => {
        commands.listen(msg);
      }).catch(console.error);
    }
  },
  'reboot': (msg) => {
    if (msg.author.id == config.adminID) process.exit(); //Requires a node module like Forever to work.
  }
};

// Wait for discord to be ready, handle messages
client.on('ready', () => {
  console.log(`${config.botName} is connected and ready`);
  let botChannel = client.channels.find('name', config.botChannel);
// Listen for commands for the bot to respond to across all channels
}).on('message', msg => {
  msg.originalContent = msg.content;
  msg.content = msg.content.toLowerCase();

  // Make sure it starts with the configured prefix
  if (!msg.content.startsWith(config.prefix)) return;

  // And that it's not on cooldown
  //let cooldownKey = config.botName + msg.content + msg.channel.id;
 // cooldowns.get(cooldownKey, config.textCmdCooldown)
   // .then(onCooldown => {
    //  if (onCooldown === false) {
        // Not on CD, check for native or static command
        let commandNoPrefix = msg.content.slice(config.prefix.length).split(' ')[0];
        console.log(`'${commandNoPrefix}' received in #${msg.channel.name} from @${msg.author.username}`);

        // check for native command first
        if (commands.hasOwnProperty(commandNoPrefix)) {
          commands[commandNoPrefix](msg);
        // then a static command we've manually added
        } else if (staticCommands.exists(commandNoPrefix)) {
          let result = staticCommands.get(commandNoPrefix);
          msg.channel.send({embed: {
            "title": commandNoPrefix,
            "color": 0x21c629,
            "description": result
          }}).then(sentMessage => cooldowns.set(cooldownKey, config.textCmdCooldown))
          .catch(console.error);
        // then a command exported from ankhbot
        } else if (ankhbotCommands.exists(commandNoPrefix)) {
          let result = ankhbotCommands.get(commandNoPrefix);
          msg.channel.send({embed: {
            "title": commandNoPrefix,
            "color": 0x21c629,
            "description": result
          }}).then(sentMessage => cooldowns.set(cooldownKey, config.textCmdCooldown))
          .catch(console.error);
        } else {
          // Not a command we recognize, ignore
        }
      //} else {
        // DM the user that it's on CD
       // dmUser(msg, `**${msg.content}** is currently on cooldown for another *${onCooldown} seconds!*`);
      }).login(config.d_token);
    //})
    


function readSfxDirectory(path)
{
  let sfxList = fs.readdirSync(sfxFilePath);
  sfxList.forEach(function(el, index, a) {
    a[index] = el.split('.')[0];
  });
  return sfxList;
}

function joinVoiceChannel(msg)
{
  return new Promise((resolve, reject) => {
    const voiceChannel = msg.member.voiceChannel;
    if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('I couldn\'t connect to your voice channel...');
    voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
  });
}

// Read/parse text lines from a file
function parseLines(filePath)
{
  let lines = [];
  let data = fs.readFileSync(filePath, 'utf-8');
  let splitLines = data.toString().split('\n');
  splitLines.forEach(function(line) {
    if (line.length > 0) {
      lines.push(line);
    }
  });
  return lines;
}

function dmUser(originalMessage, newMessage)
{
  // check that this isn't already a DM before sending
  if (originalMessage.channel.type === 'dm') {
    originalMessage.channel.send(newMessage);
  } else {
    originalMessage.member.createDM()
      .then(channel => {
        channel.send(newMessage);
      })
      .catch(console.log);
  }
}

// NOTE: INTRODUCED IN VERSION 11.3 AND REPLACES setGame
Client.prototype.setRandomActivity = function() {

	  let activity = statusentry[Math.floor(Math.random() * statusentry.length)];
  console.log(`Setting Discord activity to: ${activity}`);
     this.user.setActivity(activity, {url: `https://www.twitch.tv/tbham`, type: "STREAMING"});
};

// catch Promise errors
process.on('unhandledRejection', console.error);