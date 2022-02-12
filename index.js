
const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const JokeAPI = require('sv443-joke-api');
const SESSION_FILE_PATH = './session.json';
const classLinks = require(`./links.json`);
const schedule = require(`./schedule.json`);
const { BCGroup, BCTeacher, appAdmin, appBot } = require(`./config.json`);
const HMessages = ['!hey', '!hello', '!hiii'];
const hellos = 2;
const stickers = 1;
let sessionData = '';
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionData = require(SESSION_FILE_PATH);
}
let client;
if (sessionData !== '') {
  client = new Client({
    session: sessionData,
  });
} else {
  client = new Client();
}
client.on(`authenticated`, (session) => {
  sessionData = session;
  fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
    if (err) {
      console.error(err);
    }
  });
});

client.on('qr', (qr) => {
  console.log(`QR RECEIVED ${qr}`);
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log(`Client is ready!`);
});

client.on('message', async (msg) => {
  let chat;
  try {
    chat = await msg.getChat();
  } catch (err) {
    console.log(`Error`);
  }
  if (chat && chat.isGroup && chat.from === BCGroup &&
    msg.author === BCTeacher && msg.links &&
    msg.links[0].includes('meet.google.com')) {
    classLinks.BCM = msg.links[0];
    fs.writeFile(`./links.json`, JSON.stringify(classLinks), (err) => {
      if (err) {
        console.error(err);
      }
    });
    return;
  }
  if (msg.from === appAdmin && msg.body.startsWith('!join ') &&
    msg.links && msg.links[0].link.includes('chat.whatsapp.com')) {
    const invCode = msg.links[0].link.split('/').pop();
    try {
      await client.acceptInvite(invCode);
    } catch (err) {
      console.log(err);
    }
    return;
  }
  if (chat) {
    if (msg.body.startsWith('!')) {
      const num = msg.author ? `${msg.author}` : '';
      fs.appendFile('./logs.txt', msg.timestamp + ' : ' +
        msg.from + ' : ' + num + ' : ' + msg.body + '\n', (err) => {
          err && console.log('FS invalid:' + err);
        });
    }
    const attendanceStickers = [
      `Z5zT1L0fwNTyTuED/L3Gio1GBMfojmjd8KRtjUglY28=`,
      `GZPPu88y1lSQ2lBO1pMydOzHch3CkLVWEqHeRUzQlOU=`,
      `aIQm5yKs20cISWtbV8zPp0QMS19JL5CrwsxSYXeW/NA=`,
    ];
    if (HMessages.includes(msg.body.toLowerCase())) {
      const media = await MessageMedia.fromFilePath(
        `./stickers/hello${1 + Math.floor(Math.random() * hellos)}.jpg`);
      chat.sendMessage(media, {
        quotedMessageId: msg.id._serialized,
        sendMediaAsSticker: true,
      });
      chat.sendMessage(`Hello, 👻👻\nHow are you?`);
    }
    if (msg.body === '!joke') {
      JokeAPI.getJokes()
        .then((res) => res.json())
        .then((data) => {
          if (!data.flags.nsfw) {
            if (data.type === 'twopart' || Math.random() > 0.8) {
              msg.reply('*' + data.setup + '*');
              chat.sendMessage(data.delivery);
            } else {
              msg.reply('*' + data.joke + '*');
            }
          } else if (data.type === 'single') {
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
    }
    if (msg.body.startsWith('!sticker')) {
      let media = 'Please attach image😅';
      const mentions = await msg.getMentions();
      const quotedMsg = await msg.getQuotedMessage();
      if (msg.hasMedia) {
        if ('image' === msg.type) {
          media = await msg.downloadMedia();
        } else {
          media = 'Please attach image☹️😓';
        }
      } else if (msg.hasQuotedMsg && quotedMsg.hasMedia) {
        if ('image' === quotedMsg.type) {
          media = await quotedMsg.downloadMedia();
        } else {
          media = 'Quoted file is not image☹️😓';
        }
      } else if (mentions) {
        for (let contact of mentions) {
          try {
            const urlPic = await contact.getProfilePicUrl();
            media = await MessageMedia.fromUrl(urlPic);
          }
          catch (err) {
            media = 'contack has\'nt saved my number.😭😭beep boop';
          }
        }
      }
      chat.sendMessage(media, {
        sendMediaAsSticker: true,
      });
    }

    if (msg.body === '!help') {
      const menu = '.        *BotBot MENU*        \n\n' +
        '*!hey/hello/hiii* \t:\tpings back\n\n' +
        '*!link <classcode>*\t:\t gives class link\n\n' +
        '       >```*Class Codes*```<\n\n' +
        'AFL  \t\t|\t COA \t|\t PDC \t|\t BCM\n\n' +
        'DMT \t|\t OST \t|\t WTT \t|\t :THEORYs\n\n' +
        'DML \t|\t OSL \t|\t WTL \t|\t :LABs\n\n' +
        '*!joke*\t:\ttells a joke\n\n' +
        '*!sticker*\t:\tconverts image into stickers\n@mention someone (ask then to save the bots number)\n' +
        '*!all*\t:\t mention all   --works only in groups\n\n' +
        '*ADMIN COMMANDS* --works only in groups\n\n' +
        '*!add phoneno*\t\t:\tadds the number to the group\n\n' +
        '*!remove @mention*\t:\tremoves mentioned people\n\n' +
        '*!promote @mention*\t:\tpromotes mentioned people\n\n' +
        '*!demote @mention*\t:\tdemotes mentioned people\n\n' +
        'Just a friendly bot.👻🤪';


      chat.sendMessage(menu);
    }

    if (msg.mediaKey) {
      if (chat.isGroup && attendanceStickers.includes(msg.mediaKey)) {
        chat.sendMessage(`Hi Everyone😁👻, attendance!!`, {
          mentions: chat.groupMetadata.participants,
        });
      }
    } else if (chat.isGroup && msg.body.startsWith('!all')) {
      if (msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        chat.sendMessage(`Hi Everyone😁👻,\n please look at this!!`, {
          quotedMessageId: quotedMsg.id._serialized.toString(),
          mentions: chat.groupMetadata.participants,
        });
      } else {
        chat.sendMessage(`Hi Everyone😁👻, pay attention!!`, {
          quotedMessageId: msg.id._serialized.toString(),
          mentions: chat.groupMetadata.participants,
        });
      }
    } else if (msg.body.startsWith('!link')) {
      const content = msg.body.split(' ');
      if (content.length === 1) {
        const today = new Date();
        hour = today.getHours();
        if (hour < 18 && hour > 7 && today < 6) {
          const cclass = schedule[1][(hour - 8) < 0 ? 0 : hour - 8];
          msg.reply(`current class(${cclass}) :${classLinks[cclass]}`);
        } else {
          msg.reply(`${classLinks[`NON`]}`);
        }
      } else if (content[1] == '-h') {
        chat.sendMessage(
          '>```*Class abbreviation*```<\n' +
          'AFL  \t\t|\t COA \t|\t PDC \t|\t BCM\n' +
          'DMT \t|\t OST \t|\t WTT \t|\t :THEORYs\n' +
          'DML \t|\t OSL \t|\t WTL \t|\t :LABs');
      } else if (classLinks[content[1].toUpperCase()]) {
        msg.reply(
          'requested link\n' + (content[1].toUpperCase()) + ':' +
          (classLinks[content[1].toUpperCase()]),
        );
      } else {
        chat.sendMessage(
          '>```Class abbreviation```<\n' +
          'AFL  \t\t|\t COA \t|\t PDC \t|\t BCM\n' +
          'DMT \t|\t OST \t|\t WTT \t|\t :THEORYs\n' +
          'DML \t|\t OSL \t|\t WTL \t|\t :LABs');
      }
    } else if (chat.isGroup && msg.body.startsWith('!promote')) {
      if (!adminCheck(msg, chat) && msg.author !== appAdmin) {
        // message for non admins
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else if (msg.mentionedIds.length > 0) {
        // promotes mentioned members
        chat.promoteParticipants(msg.mentionedIds);
        const media = await MessageMedia.fromFilePath(
          `./stickers/promote` +
          `${Math.floor(1 + Math.random() * stickers)}.jpg`);
        chat.sendMessage(media, {
          sendMediaAsSticker: true,
        });
        msg.reply('promoted');
      } else if (!adminCheck(msg, chat) && msg.author === appAdmin) {
        // promotes app admin(bypass)
        chat.promoteParticipants([msg.author]);
      }
    } else if (chat.isGroup && msg.body.startsWith('!demote')) {
      if ((!adminCheck(msg, chat) && msg.author !== appAdmin) ||
        (msg.mentionedIds.includes(appAdmin) ||
          msg.mentionedIds.includes(appBot))) {
        // message for non admins
        chat.sendMessage(`Sorry, you don't have privilages.😥😭🥲`);
      } else if (msg.mentionedIds.length > 0) {
        // demotes mentioned members
        await chat.demoteParticipants(msg.mentionedIds);
        const media = await MessageMedia.fromFilePath('./stickers/hello1.jpg');
        chat.sendMessage(media, {
          sendMediaAsSticker: true,
        });
        msg.reply('demoted');
      }
    } else if (chat.isGroup && msg.body.startsWith('!invite ')) {
      if (!adminCheck(msg, chat) && msg.author !== appAdmin) {
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else {
        let number = msg.body.split(' ')[1];
        try {
          const message = await chat.getInviteCode();
          number = number.includes('@c.us') ? number : `${number}@c.us`;
          client.sendMessage(
            number.charAt[0] == '+' ? number.split(1) : number,
            `join ${chat.name} link:https://chat.whatsapp.com/${message} 👻`);
        } catch (err) {
          chat.sendMessage(`Some error occured.😶🥲😭`);
        }
      }
    } else if (chat.isGroup && msg.body.startsWith('!reset')) {
      if (!adminCheck(msg, chat) && msg.author !== appAdmin) {
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
      if (!adminCheck(msg, chat) && msg.author !== appAdmin) {
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
      if (!adminCheck(msg, chat) && msg.author !== appAdmin) {
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
      const number = msg.mentionedIds;
      if ((!adminCheck(msg, chat) && msg.author !== appAdmin) ||
        (number.includes(appAdmin) || number.includes(appBot))) {
        chat.sendMessage(`Sorry, you don't have privilages.😥😭🥲`);
      } else {
        if ((number.length < 4 || msg.author === appAdmin)) {
          try {
            await chat.removeParticipants(number);
          } catch (err) {
            console.log('Error');
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
*@param {WAWebJS.Message} message message received
*@param {WAWebJS.Chat} chat chat on which the bot is
*@return {boolean} if the sender is admin
*/
function adminCheck(message, chat) {
  if (!chat.isGroup) {
    return false;
  }
  const authorId = message.author;
  for (const participant of chat.participants) {
    if (participant.id._serialized === authorId && !participant.isAdmin) {
      return false;
    }
  }
  return true;
}
client.initialize();
