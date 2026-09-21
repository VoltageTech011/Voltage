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

function getMessageContent(message) {
    if (!message) return null;

    return (
        message.ephemeralMessage?.message ||
        message.viewOnceMessage?.message ||
        message.viewOnceMessageV2?.message ||
        message.documentWithCaptionMessage?.message ||
        message
    );
}

function getMessageType(message) {
    if (!message) return null;

    if (message.conversation) return "text";

    if (message.extendedTextMessage) return "extendedText";

    if (message.imageMessage) return "image";

    if (message.videoMessage) return "video";

    if (message.audioMessage) return "audio";

    if (message.documentMessage) return "document";

    if (message.stickerMessage) return "sticker";

    if (message.contactMessage) return "contact";

    if (message.contactsArrayMessage) return "contacts";

    if (message.locationMessage) return "location";

    if (message.liveLocationMessage) return "liveLocation";

    if (message.reactionMessage) return "reaction";

    if (message.pollCreationMessage) return "poll";

    return "unknown";
}

function extractText(message) {
    if (!message) return "";

    return (
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        message.documentMessage?.caption ||
        message.buttonsResponseMessage?.selectedDisplayText ||
        message.listResponseMessage?.title ||
        message.templateButtonReplyMessage?.selectedDisplayText ||
        ""
    ).trim();
}

function getQuotedMessage(message) {
    const context =
        message?.extendedTextMessage?.contextInfo ||
        message?.imageMessage?.contextInfo ||
        message?.videoMessage?.contextInfo ||
        message?.documentMessage?.contextInfo;

    if (!context?.quotedMessage) {
        return null;
    }

    return {
        message: context.quotedMessage,
        stanzaId: context.stanzaId || null,
        participant: context.participant || null,
        remoteJid: context.remoteJid || null
    };
}

function getMentions(message) {
    const context =
        message?.extendedTextMessage?.contextInfo ||
        message?.imageMessage?.contextInfo ||
        message?.videoMessage?.contextInfo ||
        message?.documentMessage?.contextInfo;

    return context?.mentionedJid || [];
}

class VoltageMessage {
    constructor(sock, raw) {
        this.sock = sock;
        this.raw = raw;

        const key = raw.key || {};
        const content = getMessageContent(
            raw.message
        );

        this.key = key;

        this.id = key.id || null;

        this.from = normalizeJid(
            key.remoteJid
        );

        this.sender = normalizeJid(
            key.participant ||
            key.remoteJid
        );

        this.senderNumber =
            getNumberFromJid(this.sender);

        this.senderResolved =
            this.senderNumber;

        this.pushName =
            raw.pushName || null;

        this.body = content;

        this.text = extractText(content);

        this.type = getMessageType(content);

        this.mimetype =
            content?.imageMessage?.mimetype ||
            content?.videoMessage?.mimetype ||
            content?.audioMessage?.mimetype ||
            content?.documentMessage?.mimetype ||
            content?.stickerMessage?.mimetype ||
            null;

        this.isGroup = isGroupJid(this.from);

        this.isFromMe = Boolean(
            key.fromMe
        );

        this.mentions =
            getMentions(content);

        this.quoted =
            getQuotedMessage(content);

        this.isOwner =
            isOwner(this.sender);

        this.isDev =
            isDev(this.sender);

        this.groupMetadata = null;
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
        } catch {
            return null;
        }
    }

    async reply(content, options = {}) {
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

    async send(content, options = {}) {
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

    async forward(jid = this.from) {
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
            media = this.body.imageMessage;
            type = "image";
        } else if (this.body.videoMessage) {
            media = this.body.videoMessage;
            type = "video";
        } else if (this.body.audioMessage) {
            media = this.body.audioMessage;
            type = "audio";
        } else if (this.body.documentMessage) {
            media = this.body.documentMessage;
            type = "document";
        } else if (this.body.stickerMessage) {
            media = this.body.stickerMessage;
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

        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        return Buffer.concat(chunks);
    }
}

async function serializeMessage(sock, raw) {
    if (!raw?.message) {
        return null;
    }

    const message =
        new VoltageMessage(sock, raw);

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
    getMessageType
};
