// Eugênio Fonseca

// Import the discord.js module
const Discord = require('discord.js');

// Create an instance of a Discord client
const client = new Discord.Client();

// The token of your bot - https://discordapp.com/developers/applications/me
const token = 'MzcyMTkzNzExNTk5Mzg2NjI0.DNAsEg.dNWZ8G-VYJc8A7wjnn-rmelDc_w';
const fs = require('fs');
const request = require('request');

/*
const propagandaFolder = './propaganda/';
const ussrFolder = './oldRussia/';
const ww2Folder = './ww2/';
*/
const ver = '0.8';
const help = " Commands for the Automated Auxiliary bot:\
```\n\
!aux help\n\
!aux introduce\n\
!aux add <Role 'Comrades', or 'Right', or 'Center'> \n\
!aux leave <Role 'Comrades', or 'Right', or 'Center'> \n\
!aux color < Color 'green', 'cyan', 'blue', 'indigo', 'purple', 'red', 'pink','orange', 'yellow', 'white', 'black' or '#NNNNNN', where N is between 0 and F in Hexa >\n\
!aux reddit <Subreddit formatted as: '/r/SUBRREDDITNAME'>```";

const roles = ['Comrades', 'Center', 'Right'];
const colors = ['green', 'cyan', 'blue', 'indigo', 'purple', 'red', 'pink', 'orange', 'yellow', 'white', 'black'];


/*
var propagandaFiles = [];
var ussrFiles = [];
var ww2Files = [];

function readFolder(folder, arr){
  fs.readdir(folder, (err, files) => {
    files.forEach(file => {
      arr.push(folder+file);
      console.log(folder+file);
    });
  })
}

readFolder(propagandaFolder, propagandaFiles);
readFolder(ussrFolder, ussrFiles);
readFolder(ww2Folder, ww2Files);
*/

function checkForbiddenRole(string) {
  return string == 'Assembly' || string == 'Vanguard';
}

// Generates a random integer between low and high
function randomInt(low, high) {
  return Math.floor(Math.random() * (high - low) + low);
}

// Capitalizes the first letter of a string
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Adds role to member, sends confirmation in channel
function addUserToRole(member, role, channel) {
  const roleObj = member.guild.roles.find('name', capitalizeFirstLetter(role));
  if (!roleObj || checkForbiddenRole(role)) {
    channel.send('<- Could not register ' + member.displayName + ' in requested role! ->');
    return;
  }
  /*for(var rle of roles){
    var rleObj = member.roles.find("name", rle);
    if(rleObj) member.removeRole(rleObj).catch(console.error);
  }*/
  member.addRole(roleObj).catch(console.error);
  channel.send('<- ' + member.displayName + ' now in ' + role + ' ->');
}

function getDefaultRolePermissionsForServer(guild){
  const roleObj = guild.roles.find('name', 'Citizen');
  return roleObj.permissions;
}

function getBotRolePosition(guild){
  const roleObj = guild.roles.find('name', 'Automated Comrade');
  return roleObj.position;
}


// Removes role from member, sends confirmation in channel
function removeUserFromRole(member, role, channel) {
  const roleObj = member.guild.roles.find('name', capitalizeFirstLetter(role));
  if (!roleObj || checkForbiddenRole(role)) {
    channel.send('<- Nothing done, ' + member.displayName + ' not in said role! ->');
    return;
  }
  member.removeRole(roleObj).catch(console.error);
  channel.send('<- ' + member.displayName + ' not in ' + role + ' anymore ->');
}

// Adds a color (role) to member, removes other color roles in said member, sends confirmation in channel
function setUserColor(member, role, channel) {
  // Adds a color related role to an user and removes user from other color related roles
  function addAndClear(member, role, channel) {
    for (var clr of colors) {
      var colorObj = member.roles.find("name", clr);
      if (colorObj) member.removeRole(colorObj).catch(console.error);
    }
    for (var roleContainer of member.roles) {
      if (roleContainer[1].name.includes("Color")) {
        member.removeRole(roleContainer[1]).catch(console.error);
      }
    }
    member.addRole(role).then((x) => { channel.send('<- ' + member.displayName + '\'s color changed, ' + role.name + ' ->'); })
                        .catch(console.error);
  }

  if (checkForbiddenRole(role)) {
    channel.send('<- Could not register ' + member.displayName + ' in requested color role! ->');
    return;
  } else if (role.match(/#[a-fA-F0-9]{6}/g)) { // Hexa color regex match
    const roleObj = member.guild.roles.find('name', 'Color ' + role);
    if (roleObj == null) { // Creates role if it doesn't exist yet
      member.guild.createRole({
          name: 'Color ' + role,
          color: role,
          permissions: getDefaultRolePermissionsForServer(member.guild),
          position: getBotRolePosition(member.guild) - 1
        })
        .then(role => addAndClear(member, role, channel))
        .catch((error) => { channel.send('<- Error, ' + member.displayName + ' color stills the same! ->'); console.log(error);})
    } else { // If it exists just proceeds
      addAndClear(member, roleObj, channel);
    }
  } else { // No regex match
    const roleObj = member.guild.roles.find('name', role);
    if(roleObj){ // Normal color role
      addAndClear(member, roleObj, channel);
    }
    channel.send('<- Error, not a valid color! ->')
  }
}

// Fetches a random topic at the front page of a subreddit, sends URL and permalink at channel
function getRedditFor(channel, subreddit) {
  const errorMsg = '<- Trouble getting data for ' + subreddit + ' from Reddit, make sure it\'s formatted correctly: "/r/SUBREDDITNAME" ->';

  request.get({
    url: 'https://reddit.com' + subreddit + '.json',
    json: true,
    headers: {
      'User-Agent': 'request'
    }
  }, (err, res, data) => {
    if (err || !data || !data.data || res.statusCode !== 200) {
      channel.send(errorMsg);
    } else {
      var redditData = data.data;
      if (!redditData.children || redditData.children.length == 0) {
        channel.send(errorMsg);
        return;
      }
      var post = randomInt(0, redditData.children.length);
      var permalink = redditData.children[post].data.permalink;
      var postUrl = redditData.children[post].data.url;
      if (!permalink) {
        channel.send(errorMsg);
        return;
      }
      channel.send('https://reddit.com' + permalink);
      if (postUrl) {
        channel.send(postUrl);
      }
    }
  });
}

// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
  console.log('I am ready!');
});

// Create an event listener for new guild members
client.on('guildMemberAdd', member => {
  var channel = member.guild.channels.find('name', 'general');
  if (!channel) return;
  channel.send('Welcome to the server, ' + member);
});


// Create an event listener for messages
client.on('message', message => {
  var channel = message.channel;
  var parts = message.content.split(' ');
  if (parts[0] != '!aux') return;
  switch (parts[1]) {
    case 'help':
      channel.send(help);
      break;
    case 'introduce':
      channel.send('<- ! FULLY AUTOMATED AUXILIARY OPERATIONAL (v.' + ver + ') ! ->');
      break;
      //    case 'propaganda': channel.send('', { files: [ propagandaFiles[randomInt(0,propagandaFiles.length)] ] }); break;
      //    case 'ww2': channel.send('', { files: [ ww2Files[randomInt(0,ww2Files.length)] ] }); break;
      //    case 'goodtimes': channel.send('', { files: [ ussrFiles[randomInt(0,ussrFiles.length)] ] }); break;
    case 'add':
      if (parts.length < 3) return;
      addUserToRole(message.member, parts[2], channel);
      break;
    case 'leave':
      if (parts.length < 3) return;
      removeUserFromRole(message.member, parts[2], channel);
      break;
    case 'color':
      if (parts.length < 3) return;
      setUserColor(message.member, parts[2], channel);
      break;
    case 'reddit':
      if (parts.length < 3) return;
      getRedditFor(message.channel, parts[2]);
      break;
  }
});

// Log our bot in
client.login(token);