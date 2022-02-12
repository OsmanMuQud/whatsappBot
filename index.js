
const {Client} = require('whatsapp-web.js');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const JokeAPI = require('sv443-joke-api');
const SESSION_FILE_PATH = './session.json';
const classLinks=require(`./links.json`);
const schedule=require(`./schedule.json`);

let sessionData='';
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionData = require(SESSION_FILE_PATH);
}
let client;
if (sessionData!=='') {
  client = new Client({
    session: sessionData,
  });
}
else{
  client=new Client();
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
  qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
  console.log(`Client is ready!`);
});
client.on('message', async (msg) => {
  let chat;
  try {
    chat=await msg.getChat();
  } catch {
    console.log(`Error`);
  }
  if (chat) {
    const attendanceStickers=[
      `Z5zT1L0fwNTyTuED/L3Gio1GBMfojmjd8KRtjUglY28=`,
      `GZPPu88y1lSQ2lBO1pMydOzHch3CkLVWEqHeRUzQlOU=`,
      `aIQm5yKs20cISWtbV8zPp0QMS19JL5CrwsxSYXeW/NA=`,
    ];
    if (msg.body == '!Hey') {
      msg.reply(`Hello, 👻👻\nHow are you?`);
    }
    if (msg.body=='!joke') {
      JokeAPI.getJokes()
          .then((res) => res.json())
          .then((data) => {
            if (!data.flags.nsfw) {
              if (data.type==='twopart' || Math.random()>0.8) {
                msg.reply(data.setup);
                chat.sendMessage(data.delivery);
              } else {
                msg.reply(data.setup);
              }
            } else {
              msg.reply(`Sorry brain.exe has stopped.😭😐`);
            }
          });
    }
    if (msg.mediaKey) {
      if (chat.isGroup && attendanceStickers.includes(msg.mediaKey)) {
        chat.sendMessage(`Hi Everyone😁👻, attendance!!`, {
          mentions: chat.groupMetadata.participants,
        });
      }
    } else if (chat.isGroup&&msg.body === '!all') {
      if (msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        quotedMsg.reply(`Hi Everyone😁👻,\n please look at this!!`);
      } else {
        chat.sendMessage(`Hi Everyone😁👻, pay attention!!`, {
          mentions: chat.groupMetadata.participants,
        });
      }
    } else if (msg.body.startsWith('!link')) {
      const content=msg.body.split(' ');
      if (content.length===1) {
        const today= new Date();
        hour=today.getHours();
        if (hour<18 && hour > 7 && today < 6) {
          const cclass=schedule[1][(hour-8)<0?0:hour-8];
          msg.reply(`current class(${cclass}) :${classLinks[cclass]}`);
        } else {
          msg.reply(`${classLinks[`NON`]}`);
        }
      } else if (content[1]=='-h') {
        chat.sendMessage(`
        Class abbreviation\n\n
        AFL\tCOA\tPDC\n
        DMT\tOST\tWTT\t:THEORYs\n
        DML\tOSL\tWTL\t:LABs`,
        );
      } else if (classLinks[content[1].toUpperCase()]) {
        msg.reply(
            `current class\n
            ${content[1].toUpperCase()}:${classLinks[content[1].toUpperCase()]}`);
      } else {
        chat.sendMessage(
            `Class abbreviation\n\n
        AFL\tCOA\tPDC\n
        DMT\tOST\tWTT\t:THEORYs\n
        DML\tOSL\tWTL\t:LABs`);
      }
    } else if (chat.isGroup && msg.body.startsWith('!promote')) {
      if (!adminCheck(msg, chat) && msg.author!=='917004172771@c.us') {
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else if (msg.mentionedIds.length>0) {
        chat.promoteParticipants(msg.mentionedIds);
      }
    } else if (chat.isGroup && msg.body.startsWith('!demote')) {
      if (!adminCheck(msg, chat) && msg.author!=='917004172771@c.us') {
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else if (msg.mentionedIds.length>0) {
        await chat.demoteParticipants(msg.mentionedIds);
      }
    } else if (chat.isGroup && msg.body.startsWith('!invite')) {
      if (!adminCheck(msg, chat) && msg.author!=='917004172771@c.us') {
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else {
        let number = msg.body.split(' ')[1];
        try {
          const message= await chat.getInviteCode();
          number = number.includes('@c.us') ? number : `${number}@c.us`;
          client.sendMessage(
              number.charAt[0]=='+'?number.split(1):number,
              `join ${chat.name} link:https://chat.whatsapp.com/${message} 👻`);
        } catch {
          chat.sendMessage(`Some error occured.😶🥲😭`);
        }
      }
    } else if (chat.isGroup && msg.body.startsWith('!reset')) {
      if (!adminCheck(msg, chat) && msg.author!=='917004172771@c.us') {
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else {
        try {
          await chat.revokeInviteCode();
          chat.sendMessage(`Link reset!😎😏`);
        } catch {
          chat.sendMessage(`Link not reset`);
        }
      }
    }else if (chat.isGroup && msg.body.startsWith('!invitelink')) {
      if (!adminCheck(msg, chat) && msg.author!=='917004172771@c.us') {
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else {
        try {
          const message= await chat.getInviteCode();
          chat.sendMessage(
              `${chat.name} link:https://chat.whatsapp.com/${message} 👻`);
        } catch {
          chat.sendMessage(`Sorry cant do.`);
        }
      }
    } else if (chat.isGroup && msg.body.startsWith('!add')) {
      if (!adminCheck(msg, chat) && msg.author!=='917004172771@c.us') {
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else {
        let number = msg.body.split(' ')[1];
        number = number.includes('@c.us') ? number : `${number}@c.us`;
        try {
          await chat.addParticipants(
              [number.charAt[0]=='+'?number.split(1):number],
          );
        } catch {
          console.error('Error');
        }
      }
    } else if (chat.isGroup && msg.body.startsWith('!remove')) {
      if (!adminCheck(msg, chat) && msg.author!=='917004172771@c.us') {
        chat.sendMessage(`Sorry, only admins can use this command.😥😭🥲`);
      } else {
        const number = msg.mentionedIds;
        if (number.length<4 || msg.author==='917004172771@c.us') {
          try {
            await chat.removeParticipants(number);
          } catch {
            console.log('Error');
          }
        } else {
          chat.sendMessage(`Will only remove 3 people once.😒😶`);
        }
      }
    }
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
