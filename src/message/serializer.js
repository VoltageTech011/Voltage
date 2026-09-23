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

    for (let i = 0; i < 10; i++) {
        if (!current) {
            return null;
        }

        if (current.ephemeralMessage?.message) {
            current =
                current.ephemeralMessage.message;
            continue;
        }

        if (current.viewOnceMessage?.message) {
            current =
                current.viewOnceMessage.message;
            continue;
        }

        if (current.viewOnceMessageV2?.message) {
            current =
                current.viewOnceMessageV2.message;
            continue;
        }

        if (
            current.viewOnceMessageV2Extension?.message
        ) {
            current =
                current.viewOnceMessageV2Extension.message;
            continue;
        }

        if (
            current.documentWithCaptionMessage?.message
        ) {
            current =
                current.documentWithCaptionMessage.message;
            continue;
        }

        if (
            current.editedMessage?.message
        ) {
            current =
                current.editedMessage.message;
            continue;
        }

        break;
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

    if (message.pinInChatMessage) {
        return "pinInChat";
    }

    if (message.call) {
        return "call";
    }

    return "unknown";
}

function extractText(message) {
    if (!message) {
        return "";
    }

    return (
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        message.documentMessage?.caption ||
        message.buttonsResponseMessage?.selectedDisplayText ||
        message.listResponseMessage?.title ||
        message.templateButtonReplyMessage?.selectedDisplayText ||
        message.interactiveResponseMessage?.body?.text ||
        message.interactiveResponseMessage?.nativeFlowResponseMessage
            ?.paramsJson ||
        ""
    ).trim();
}

function getContextInfo(message) {
    if (!message) {
        return null;
    }

    return (
        message.extendedTextMessage?.contextInfo ||
        message.imageMessage?.contextInfo ||
        message.videoMessage?.contextInfo ||
        message.audioMessage?.contextInfo ||
        message.documentMessage?.contextInfo ||
        message.stickerMessage?.contextInfo ||
        message.buttonsResponseMessage?.contextInfo ||
        message.listResponseMessage?.contextInfo ||
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
        message:
            context.quotedMessage,

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
    return (
        message?.imageMessage?.mimetype ||
        message?.videoMessage?.mimetype ||
        message?.audioMessage?.mimetype ||
        message?.documentMessage?.mimetype ||
        message?.stickerMessage?.mimetype ||
        null
    );
}

class VoltageMessage {
    constructor(sock, raw) {
        this.sock = sock;
        this.raw = raw;

        const key =
            raw?.key || {};

        const content =
            getMessageContent(
                raw?.message
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
            extractText(content);

        this.type =
            getMessageType(content);

        this.mimetype =
            getMimetype(content);

        this.isGroup =
            isGroupJid(
                this.from
            );

        this.isFromMe =
            Boolean(
                key.fromMe
            );

        this.mentions =
            getMentions(content);

        this.quoted =
            getQuotedMessage(content);

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

        this.mediaUrl =
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
                "[Voltage] Group metadata error:",
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
        const message =
            typeof content === "string"
                ? {
                    text: content
                }
                : content;

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
            "[Voltage] Serializer rejected message: missing message/key."
        );

        return null;
    }

    const message =
        new VoltageMessage(
            sock,
            raw
        );

    if (
        message.type === "unknown"
    ) {
        console.log(
            "[Voltage] Unknown message structure:",
            Object.keys(
                message.body || {}
            )
        );

        console.log(
            "[Voltage] Raw message keys:",
            Object.keys(
                raw.message || {}
            )
        );
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
