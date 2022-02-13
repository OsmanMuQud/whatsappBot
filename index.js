
const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const JokeAPI = require('sv443-joke-api');
const SESSION_FILE_PATH = './session.json';
const classLinks = require(`./links.json`);
const schedule = require(`./schedule.json`);
const menu = require(`./menu.json`)
const { BCGroup, BCTeacher, appAdmin, appBot } = require(`./config.json`);
const helloMessage = ['!hey', '!hello', '!hiii'];
const helloReplies = [
  'Hello, 👻👻\nHow are you?',
  'Hoi!👻\nWhat can i do for you.',
  'Hey Bud, Whats up🥳👻',
];
const linkFormat =
  '>``` *Class abbreviation* ```<\n' +
  'AFL  \t|\t COA \t|\t PDC \t|\t BCM\n' +
  'DMT \t|\t OST \t|\t WTT \t|\t :THEORYs\n' +
  'DML \t|\t OSL \t|\t WTL \t|\t :LABs\n';
const hellos = 2;
const stickers = 1;
// attendance stickers
// const attendanceStickers = [
//   `WdOV2XZYib5pgC3kf48XzFh8lk55sX746SnaDNq5ja8=`,
//   `GZPPu88y1lSQ2lBO1pMydOzHch3CkLVWEqHeRUzQlOU=`,
// ];
const savedMedia = {};
let sessionData = '';
// fetching old saved session
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionData = require(SESSION_FILE_PATH);
}
let client;
// starting saved session
if (sessionData !== '') {
  client = new Client({
    session: sessionData
  });
} else {
  client = new Client();
}
// runs on getting authenticated saves the new session
client.on(`authenticated`, (session) => {
  sessionData = session;
  fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
    if (err) {
      console.error(err);
    }
  });
});
// generates the qr code for the new session
client.on('qr', (qr) => {
  console.log(`QR RECEIVED ${qr}`);
  qrcode.generate(qr, { small: true });
});
// runs when client connects and is ready
client.on('ready', () => {
  console.log(`Client is ready!`);
});
// recieves a message event
client.on('message', async (msg) => {
  let chat;// chat object
  try {
    chat = await msg.getChat();
  } catch (err) {
    console.log(`Didnt get message`);
  }
  if (chat && chat.isGroup && chat.from === BCGroup &&
    msg.author === BCTeacher && msg.links &&
    msg.links[0].includes('meet.google.com')) {
    // checks for link update condition
    classLinks.BCM = msg.links[0].link;// change local instance
    // uploads to the fs
    fs.writeFile(`./links.json`, JSON.stringify(classLinks), (err) => {
      if (err) {
        console.error(err);
      }
    });
    return;
  }
  if (msg.from === appAdmin && msg.body.startsWith('!join ') &&
    // checks if join link is from appAdmin
    msg.links && msg.links[0].link.includes('chat.whatsapp.com')) {
    const invCode = msg.links[0].link.split('/').pop();
    // trims the code and gets
    try {
      await client.acceptInvite(invCode);
    } catch (err) {
      console.log(err);
    }
    return;
  }
  // if chat is not undefined no error in fetching chat

  if (chat) {
    // logs all message addressed to the bot
    if (msg.body.startsWith('!')) {
      const num = msg.author ? `${msg.author}` : '';
      // append to local file
      fs.appendFile('./logs.txt', msg.timestamp + ' : ' +
        msg.from + ' : ' + num + ' : ' + msg.body + '\n', (err) => {
          err && console.log('FS invalid:' + err);
        });
    }
    // checks if helloMessage is valide for reply and pings back with sticker
    if (helloMessage.includes(msg.body.toLowerCase())) {
      const media = await MessageMedia.fromFilePath(
        `./stickers/hello${1 + Math.floor(Math.random() * hellos)}.jpg`);
      chat.sendMessage(media, { // sticker media
        quotedMessageId: msg.id._serialized, // message to which the reply is
        sendMediaAsSticker: true, // send image as sticker
      });
      // replies from the list randomly
      chat.sendMessage(
        helloReplies[Math.floor(Math.random() * helloReplies.length)]);
    } else if (msg.body === '!joke') {
      // send a joke after fetching from api
      JokeAPI.getJokes() // api call
        .then((res) => res.json())
        .then((data) => {
          if (!data.flags.nsfw || Math.random() < 0.95) {
            // avoids nfsw jokes random chance of fake crash
            if (data.type === 'twopart') {
              msg.reply('*' + data.setup + '*');
              chat.sendMessage(data.delivery);
            } else {
              msg.reply('*' + data.joke + '*');
            }
          } else {
            try {
              const media = MessageMedia.fromFilePath(
                `./stickers/sticker1.jpg`,
              );
              chat.sendMessage(media, {
                caption: 'Brain.exe stopped!',
                sendMediaAsSticker: true,
              });
            } catch (err) {
              console.log(err);
            }
          }
        });
    } else if (msg.body.startsWith('!sticker')) {
      // gets the message media and converts it into sticker
      let media = 'Please attach image😅';
      try {
        const mentions = await msg.getMentions();
        // gets mentions {Class Contacts}
        const quotedMsg = await msg.getQuotedMessage();
        // gets quoted message
        if (msg.hasMedia) {// if message has media it is converted to sticker
          if ('image' === msg.type) {
            media = await msg.downloadMedia();// download the media
          } else {
            media = 'Please attach image☹️😓';
          }
        } else if (msg.hasQuotedMsg && quotedMsg.hasMedia) {
          // if quotedMsg has media it is converted to sticker
          if ('image' === quotedMsg.type) {
            try {
              media = await quotedMsg.downloadMedia();
            } catch (err) {
              console.log(err);
              media = 'Something went wrong\nSorry😐😶‍🌫️';
            }
          } else {
            media = 'Quoted file is not image☹️😓';
          }
        } else if (mentions) { // checks if mentions are available
          for (const contact of mentions) {
            try {
              const urlPic = await contact.getProfilePicUrl();
              // gets profile pic of each contact
              media = await MessageMedia.fromUrl(urlPic);
            } catch (err) {
              media = 'contack has\'nt saved my number.😭😭beep boop';
            }
          }
        }
        // sends the media as selected above
        chat.sendMessage(media, {
          sendMediaAsSticker: true,
        });
      } catch (err) {
        console.log(err);
        chat.sendMessage('This file was spammed to often');
      }
    } else if (msg.body === '!help') {
      // prints the help log
      chat.sendMessage(menu.m1 + linkFormat + menu.m2);
    } else if (msg.hasQuotedMsg && msg.body.startsWith('!save ')) {
      // checks if the messages are attendance sticker and mentions all
      const public = msg.body.endsWith('-public');
      const name = msg.body.split(' ')[1];
      let status = 'File saved successfully🥳🥳';
      try {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.hasMedia) {
          try {
            if (!savedMedia.hasOwnProperty(name)) {
              const media = await quotedMsg.downloadMedia();
              if (!media.mimetype.includes('video/')) {
                savedMedia[name] = {
                  'public': public,
                  'media': media,
                  'from': msg.from,
                };
              }
              else {
                status = 'videos/gifs not supported.\nSorry😭😓'
              }
            } else {
              status = 'File name already exists🥲';
            }
            // fs.writeFile('./savedData.json', JSON.stringify(media), err => {
            //   console.log(err + 'error');
            // });
          } catch (err) {
            console.log(err, 'Spammed Here');
            status = 'Something went wrong\nSorry😐😶‍🌫️';
          }
        }
      } catch (err) {
        console.log(error);
      }
      msg.reply(status);
    } else if (msg.body.startsWith('!send ')) {
      // mentions all participants
      const name = msg.body.slice(6);
      let status = 'File sent successfully🥳🥳';
      if (savedMedia.hasOwnProperty(name)) {
        if (
          savedMedia[name].public ||
          msg.from === savedMedia[name].from ||
          msg.from === appAdmin ||
          msg.author === appAdmin) {
          // consition for sending file
          media = savedMedia[name].media;
          try {
            msg.reply(media);
          }
          catch (err) {
            status = 'Trouble sending the file.';
            console.log(err);
          }
        } else {
          status = 'its a private file';
        }
      } else {
        status = 'File notfound😓';
      }
      chat.sendMessage(status);
    } else if (msg.body.startsWith('!showfiles')) {
      let savedFiles = 'Nothing is saved!😐☹️';
      for (const file in savedMedia) {
        if (savedMedia.hasOwnProperty(file)) {
          savedFiles = '*' + file + '*' + ' : ' +
            savedMedia[file].media.mimetype + '\n' +
            'available here : ' +
            (savedMedia[file].from === msg.from).toString() + '\n\n';
        }
      }
      msg.reply(savedFiles);
    } else if (
      (msg.author === appAdmin ||
        msg.from === appAdmin) &&
      msg.body.startsWith('!delete ')) {
      const name = msg.body.slice(9);
      if (savedMedia.hasOwnProperty(file)) {
        delete savedMedia[name];
        msg.reply(name + ' deleted successfully.😏');
      } else {
        msg.reply(name + ' does not exist.😶‍🌫️');
      }
    } else if (chat.isGroup && msg.body.startsWith('!all')) {
      if (msg.hasQuotedMsg) {// replies to quoted message
        const quotedMsg = await msg.getQuotedMessage();
        chat.sendMessage(`Hi Everyone😁👻,\n please look at this!!`, {
          quotedMessageId: quotedMsg.id._serialized.toString(),
          mentions: chat.groupMetadata.participants,
        });
      } else {// mentions quoting current message
        chat.sendMessage(`Hi Everyone😁👻, pay attention!!`, {
          quotedMessageId: msg.id._serialized.toString(),
          mentions: chat.groupMetadata.participants,
        });
      }
    } else if (chat.isGroup && msg.body.startsWith('!admins')) {
      // mentions all the admins
      const admins = chat.groupMetadata.participants.filter(
        // filters all admins from participants
        (part) => adminCheck(part.author, chat));
      if (msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        chat.sendMessage(`Hi Everyone😁👻,\n please look at this!!`, {
          quotedMessageId: quotedMsg.id._serialized.toString(),
          mentions: admins,
        });
      } else {
        chat.sendMessage(`Hi Everyone😁👻, pay attention!!`, {
          quotedMessageId: msg.id._serialized.toString(),
          mentions: admins,
        });
      }
    } else if (msg.body.startsWith('!link')) {
      // sends meet link to the chat
      const content = msg.body.split(' ');
      if (content.length === 1) {
        const today = new Date();// gets current day time
        hour = today.getHours();
        if (hour < 18 && hour > 7 && today < 6) {
          // checks if the time if in the college time
          const cclass = schedule[1][(hour - 8) < 0 ? 0 : hour - 8];
          // fetches classCode from schedule
          msg.reply(`\`\`\`current class\`\`\`` +
            `(${cclass}) :${classLinks[cclass]}`);
          // sends the link
        } else {
          msg.reply(`${classLinks[`NON`]}`);
        }
      } else if (content[1] == '-h') {
        // prints the format
        chat.sendMessage(linkFormat);
      } else if (classLinks[content[1].toUpperCase()]) {
        msg.reply(
          'requested link\n' + (content[1].toUpperCase()) + ':' +
          (classLinks[content[1].toUpperCase()]),
        );
      } else {
        chat.sendMessage(linkFormat);
      }
    } else if (chat.isGroup && msg.body.startsWith('!promote')) {
      // promotes mentioned user
      if (!adminCheck(msg.author, chat) && msg.author !== appAdmin) {
        // message for non admins
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else if (msg.mentionedIds.length > 0) {
        // promotes mentioned members
        chat.promoteParticipants(msg.mentionedIds);
        const media = await MessageMedia.fromFilePath(
          `./stickers/promote` +
          `${Math.floor(1 + Math.random() * stickers)}.jpg`);
        // selects a random sticker
        chat.sendMessage(media, {
          sendMediaAsSticker: true,
        });
        msg.reply('promoted');
      } else if (!adminCheck(msg.author, chat) && msg.author === appAdmin) {
        // promotes app admin(bypass)
        chat.promoteParticipants([msg.author]);
      }
    } else if (chat.isGroup && msg.body.startsWith('!demote')) {
      if ((!adminCheck(msg.author, chat) && msg.author !== appAdmin) ||
        (msg.mentionedIds.includes(appAdmin) ||
          msg.mentionedIds.includes(appBot))) {
        // message for non admins
        chat.sendMessage(`Are you komedy me?.😏🤣😭🥲`);
      } else if (msg.mentionedIds.length > 0) {
        // demotes mentioned members
        await chat.demoteParticipants(msg.mentionedIds);
        const media = await MessageMedia.fromFilePath('./stickers/hello1.jpg');
        // selects a random sticker
        chat.sendMessage(media, {
          sendMediaAsSticker: true,
        });
        msg.reply('demoted');
      }
    } else if (chat.isGroup && msg.body.startsWith('!invite ')) {
      // sends group invite link to phone number
      // adminCheck
      if (!adminCheck(msg.author, chat) && msg.author !== appAdmin) {
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else {
        let number = msg.body.split(' ')[1];
        try {
          const message = await chat.getInviteCode();
          // adds formating to number
          number = number.includes('@c.us') ? number : `${number}@c.us`;
          client.sendMessage(
            number.charAt[0] == '+' ? number.split(1) : number,
            `join ${chat.name} link:https://chat.whatsapp.com/${message} 👻`);
          // sends generated link
        } catch (err) {
          chat.sendMessage(`Some error occured.😶🥲😭`);
        }
      }
    } else if (chat.isGroup && msg.body.startsWith('!reset')) {
      // resets the invitation link
      // adminCheck
      if (!adminCheck(msg.author, chat) && msg.author !== appAdmin) {
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else {
        try {
          await chat.revokeInviteCode();
          chat.sendMessage(`Link reset!😎😏`);
        } catch (err) {
          chat.sendMessage(`Link not reset:` + err);
        }
      }
    } else if (chat.isGroup && msg.body.startsWith('!invitelink')) {
      // sends the invite link to the chat
      // adminCheck
      if (!adminCheck(msg.author, chat) && msg.author !== appAdmin) {
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else {
        try {
          const message = await chat.getInviteCode();
          chat.sendMessage(
            `${chat.name} link:https://chat.whatsapp.com/${message} 👻`);
        } catch (err) {
          chat.sendMessage(`Sorry cant do.`);
        }
      }
    } else if (chat.isGroup && msg.body.startsWith('!add')) {
      // adds the given phone number to the group
      // adminCheck
      if (!adminCheck(msg.author, chat) && msg.author !== appAdmin) {
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else {
        let number = msg.body.split(' ')[1];
        number = number.includes('@c.us') ? number : `${number}@c.us`;
        try {
          await chat.addParticipants(
            [number.charAt(0) == '+' ? number.slice(1) : number],
          );
        } catch (err) {
          console.error('Error');
        }
      }
    } else if (chat.isGroup && msg.body.startsWith('!remove')) {
      // removes mentioned user
      const number = msg.mentionedIds;
      if ((!adminCheck(msg.author, chat) && msg.author !== appAdmin) ||
        (number.includes(appAdmin) || number.includes(appBot))) {
        chat.sendMessage(`Are you komedy me?.😏🤣😭🥲`);
      } else {
        if ((number.length < 4 || msg.author === appAdmin)) {
          try {
            await chat.removeParticipants(number);
          } catch (err) {
            console.log('I am not an admin');
          }
        } else {
          chat.sendMessage(`Will only remove 3 people once.😒😶`);
        }
      }
    }
  }
  try {
    await msg.sendSeen();
  } catch (err) {

  }
});
/**
*this function checks if the sender is an admin or not
*@param {string} author message received
*@param {WAWebJS.Chat} chat chat on which the bot is
*@return {boolean} if the sender is admin
*/
function adminCheck(author, chat) {
  if (!chat.isGroup) {
    return false;
  }
  for (const participant of chat.participants) {
    if (participant.id._serialized === author && !participant.isAdmin) {
      return false;
    }
  }
  return true;
}
client.initialize();
