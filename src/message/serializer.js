const {
downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const {
normalizeJid,
getNumberFromJid,
isGroupJid
} = require("./jid");

const {
isOwner,
isDev
} = require("./permissions");

function unwrapMessage(message) {
if (!message) {
return null;
}

let current = message;

const wrappers = [
    "ephemeralMessage",
    "viewOnceMessage",
    "viewOnceMessageV2",
    "viewOnceMessageV2Extension",
    "documentWithCaptionMessage"
];

let changed = true;

while (changed && current) {
    changed = false;

    for (const wrapper of wrappers) {
        if (current?.[wrapper]?.message) {
            current = current[wrapper].message;
            changed = true;
            break;
        }
    }
}

return current;

}

function getMessageContent(message) {
return unwrapMessage(message);
}

function getMessageType(message) {
if (!message) {
return null;
}

if (message.conversation) {
    return "text";
}

if (message.extendedTextMessage) {
    return "extendedText";
}

if (message.imageMessage) {
    return "image";
}

if (message.videoMessage) {
    return "video";
}

if (message.audioMessage) {
    return "audio";
}

if (message.documentMessage) {
    return "document";
}

if (message.stickerMessage) {
    return "sticker";
}

if (message.contactMessage) {
    return "contact";
}

if (message.contactsArrayMessage) {
    return "contacts";
}

if (message.locationMessage) {
    return "location";
}

if (message.liveLocationMessage) {
    return "liveLocation";
}

if (message.reactionMessage) {
    return "reaction";
}

if (message.pollCreationMessage) {
    return "poll";
}

if (message.pollUpdateMessage) {
    return "pollUpdate";
}

if (message.protocolMessage) {
    return "protocol";
}

if (message.senderKeyDistributionMessage) {
    return "senderKeyDistribution";
}

return "unknown";

}

function extractText(message) {
if (!message) {
return "";
}

const content =
    unwrapMessage(message);

if (!content) {
    return "";
}

return String(
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    content.buttonsResponseMessage?.selectedDisplayText ||
    content.listResponseMessage?.title ||
    content.templateButtonReplyMessage?.selectedDisplayText ||
    content.interactiveResponseMessage?.body?.text ||
    content.interactiveResponseMessage?.button_reply?.title ||
    content.interactiveResponseMessage?.list_reply?.title ||
    ""
).trim();

}

function getContextInfo(message) {
if (!message) {
return null;
}

const content =
    unwrapMessage(message);

if (!content) {
    return null;
}

return (
    content.extendedTextMessage?.contextInfo ||
    content.imageMessage?.contextInfo ||
    content.videoMessage?.contextInfo ||
    content.audioMessage?.contextInfo ||
    content.documentMessage?.contextInfo ||
    content.stickerMessage?.contextInfo ||
    null
);

}

function getQuotedMessage(message) {
const context =
getContextInfo(message);

if (!context?.quotedMessage) {
    return null;
}

return {
    message: context.quotedMessage,
    stanzaId:
        context.stanzaId || null,
    participant:
        context.participant || null,
    remoteJid:
        context.remoteJid || null
};

}

function getMentions(message) {
const context =
getContextInfo(message);

return context?.mentionedJid || [];

}

function getMimetype(message) {
const content =
unwrapMessage(message);

if (!content) {
    return null;
}

return (
    content.imageMessage?.mimetype ||
    content.videoMessage?.mimetype ||
    content.audioMessage?.mimetype ||
    content.documentMessage?.mimetype ||
    content.stickerMessage?.mimetype ||
    null
);

}

class VoltageMessage {
constructor(sock, raw) {
this.sock = sock;
this.raw = raw;

    const key =
        raw?.key || {};

    const originalContent =
        raw?.message || null;

    const content =
        getMessageContent(
            originalContent
        );

    this.key = key;

    this.id =
        key.id || null;

    this.from =
        normalizeJid(
            key.remoteJid
        );

    this.sender =
        normalizeJid(
            key.participant ||
            key.remoteJid
        );

    this.senderNumber =
        getNumberFromJid(
            this.sender
        );

    this.senderResolved =
        this.senderNumber;

    this.pushName =
        raw?.pushName || null;

    this.body =
        content;

    this.text =
        extractText(
            originalContent
        );

    this.type =
        getMessageType(
            content
        );

    this.mimetype =
        getMimetype(
            content
        );

    this.isGroup =
        isGroupJid(
            this.from
        );

    this.isFromMe =
        Boolean(
            key.fromMe
        );

    this.mentions =
        getMentions(
            originalContent
        );

    this.quoted =
        getQuotedMessage(
            originalContent
        );

    this.isMedia =
        [
            "image",
            "video",
            "audio",
            "document",
            "sticker"
        ].includes(
            this.type
        );

    this.mediaType =
        this.isMedia
            ? this.type
            : null;

    this.mediaUrl =
        null;

    this.isOwner =
        isOwner(
            this.sender,
            this
        );

    this.isDev =
        isDev(
            this.sender
        );

    this.groupMetadata =
        null;

    this.trigger =
        null;

    this.command =
        null;
}

async loadGroupMetadata() {
    if (!this.isGroup) {
        return null;
    }

    try {
        this.groupMetadata =
            await this.sock.groupMetadata(
                this.from
            );

        return this.groupMetadata;
    } catch (error) {
        console.error(
            "[Voltage] Failed to load group metadata:",
            error.message
        );

        return null;
    }
}

async reply(
    content,
    options = {}
) {
    return this.sock.sendMessage(
        this.from,
        {
            text: String(content)
        },
        {
            quoted: this.raw,
            ...options
        }
    );
}

async send(
    content,
    options = {}
) {
    let message;

    if (
        typeof content === "string"
    ) {
        message = {
            text: content
        };
    } else {
        message = content;
    }

    return this.sock.sendMessage(
        this.from,
        message,
        options
    );
}

async edit(
    messageKey,
    content,
    options = {}
) {
    if (!messageKey) {
        throw new Error(
            "Cannot edit message: message key unavailable."
        );
    }

    return this.sock.sendMessage(
        this.from,
        {
            text: String(content),
            edit: messageKey
        },
        options
    );
}

async react(emoji) {
    return this.sock.sendMessage(
        this.from,
        {
            react: {
                text: emoji,
                key: this.key
            }
        }
    );
}

async forward(
    jid = this.from
) {
    return this.sock.sendMessage(
        jid,
        {
            forward: this.raw
        }
    );
}

async download() {
    if (!this.body) {
        throw new Error(
            "This message has no downloadable content."
        );
    }

    let media;
    let type;

    if (this.body.imageMessage) {
        media =
            this.body.imageMessage;
        type = "image";
    } else if (
        this.body.videoMessage
    ) {
        media =
            this.body.videoMessage;
        type = "video";
    } else if (
        this.body.audioMessage
    ) {
        media =
            this.body.audioMessage;
        type = "audio";
    } else if (
        this.body.documentMessage
    ) {
        media =
            this.body.documentMessage;
        type = "document";
    } else if (
        this.body.stickerMessage
    ) {
        media =
            this.body.stickerMessage;
        type = "sticker";
    }

    if (!media) {
        throw new Error(
            "This message does not contain downloadable media."
        );
    }

    const stream =
        await downloadContentFromMessage(
            media,
            type
        );

    const chunks = [];

    for await (
        const chunk of stream
    ) {
        chunks.push(chunk);
    }

    return Buffer.concat(
        chunks
    );
}

}

async function serializeMessage(
sock,
raw
) {
if (
!raw?.message ||
!raw?.key
) {
console.log(
"[Voltage] Serializer: invalid raw message."
);

    return null;
}

const message =
    new VoltageMessage(
        sock,
        raw
    );

console.log(
    `[Voltage] Serializer: type=${message.type} text=${JSON.stringify(message.text)} from=${message.from} sender=${message.sender}`
);

if (
    message.type === "protocol" ||
    message.type === "senderKeyDistribution"
) {
    return message;
}

if (
    !message.text &&
    !message.isMedia
) {
    console.log(
        `[Voltage] Serializer: no usable text/media in message ${message.id || "unknown"}.`
    );

    return message;
}

if (message.isGroup) {
    await message.loadGroupMetadata();
}

return message;

}

module.exports = {
VoltageMessage,
serializeMessage,
getMessageContent,
extractText,
getMessageType,
getQuotedMessage,
getMentions
};
