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

    if (message.ephemeralMessage?.message) {
        return unwrapMessage(
            message.ephemeralMessage.message
        );
    }

    if (message.viewOnceMessage?.message) {
        return unwrapMessage(
            message.viewOnceMessage.message
        );
    }

    if (message.viewOnceMessageV2?.message) {
        return unwrapMessage(
            message.viewOnceMessageV2.message
        );
    }

    if (message.viewOnceMessageV2Extension?.message) {
        return unwrapMessage(
            message.viewOnceMessageV2Extension.message
        );
    }

    if (message.documentWithCaptionMessage?.message) {
        return unwrapMessage(
            message.documentWithCaptionMessage.message
        );
    }

    if (message.editedMessage?.message) {
        return unwrapMessage(
            message.editedMessage.message
        );
    }

    return message;
}


function getMessageContent(message) {
    return unwrapMessage(message);
}


function getMessageType(message) {
    const content =
        unwrapMessage(message);

    if (!content) {
        return "unknown";
    }

    if (content.conversation) {
        return "text";
    }

    if (content.extendedTextMessage) {
        return "extendedText";
    }

    if (content.imageMessage) {
        return "image";
    }

    if (content.videoMessage) {
        return "video";
    }

    if (content.audioMessage) {
        return "audio";
    }

    if (content.documentMessage) {
        return "document";
    }

    if (content.stickerMessage) {
        return "sticker";
    }

    if (content.contactMessage) {
        return "contact";
    }

    if (content.contactsArrayMessage) {
        return "contacts";
    }

    if (content.locationMessage) {
        return "location";
    }

    if (content.liveLocationMessage) {
        return "liveLocation";
    }

    if (content.reactionMessage) {
        return "reaction";
    }

    if (content.pollCreationMessage) {
        return "poll";
    }

    if (content.buttonsResponseMessage) {
        return "buttonResponse";
    }

    if (content.listResponseMessage) {
        return "listResponse";
    }

    if (content.templateButtonReplyMessage) {
        return "templateButtonResponse";
    }

    if (content.interactiveResponseMessage) {
        return "interactiveResponse";
    }

    return "unknown";
}


function extractText(message) {
    const content =
        unwrapMessage(message);

    if (!content) {
        return "";
    }

    const text =
        content.conversation ||
        content.extendedTextMessage?.text ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        content.documentMessage?.caption ||
        content.buttonsResponseMessage?.selectedDisplayText ||
        content.buttonsResponseMessage?.selectedButtonId ||
        content.listResponseMessage?.title ||
        content.listResponseMessage?.singleSelectReply?.selectedRowId ||
        content.templateButtonReplyMessage?.selectedDisplayText ||
        content.templateButtonReplyMessage?.selectedId ||
        content.interactiveResponseMessage?.body?.text ||
        content.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
        "";

    return String(text).trim();
}


function getContextInfo(message) {
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
        content.buttonsResponseMessage?.contextInfo ||
        content.listResponseMessage?.contextInfo ||
        content.templateButtonReplyMessage?.contextInfo ||
        content.interactiveResponseMessage?.contextInfo ||
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

    return (
        context?.mentionedJid || []
    );
}


function getMimetype(message) {
    const content =
        unwrapMessage(message);

    return (
        content?.imageMessage?.mimetype ||
        content?.videoMessage?.mimetype ||
        content?.audioMessage?.mimetype ||
        content?.documentMessage?.mimetype ||
        content?.stickerMessage?.mimetype ||
        null
    );
}


function getConnectedJid(sock) {
    return normalizeJid(
        sock?.user?.id
    );
}


function getConnectedNumber(sock) {
    const connectedJid =
        getConnectedJid(sock);

    if (!connectedJid) {
        return null;
    }

    return getNumberFromJid(
        connectedJid
    );
}


function resolveSender(sock, key) {
    const rawSender =
        normalizeJid(
            key?.participant ||
            key?.remoteJid
        );

    if (!rawSender) {
        return {
            jid: null,
            number: null,
            resolved: null
        };
    }

    /*
     * Messages sent by the connected account
     * can arrive using the account's @lid JID.
     *
     * For fromMe messages, we can safely resolve
     * the sender to the connected account.
     */
    if (key?.fromMe) {
        const connectedJid =
            getConnectedJid(sock);

        const connectedNumber =
            getConnectedNumber(sock);

        return {
            jid:
                rawSender,

            number:
                connectedNumber ||
                getNumberFromJid(
                    rawSender
                ),

            resolved:
                connectedNumber ||
                getNumberFromJid(
                    rawSender
                )
        };
    }

    const number =
        getNumberFromJid(
            rawSender
        );

    return {
        jid:
            rawSender,

        number:
            number,

        resolved:
            number
    };
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

        this.key =
            key;

        this.id =
            key.id || null;

        this.from =
            normalizeJid(
                key.remoteJid
            );

        const sender =
            resolveSender(
                sock,
                key
            );

        this.sender =
            sender.jid;

        this.senderNumber =
            sender.number;

        this.senderResolved =
            sender.resolved;

        this.pushName =
            raw?.pushName || null;

        this.body =
            content;

        this.text =
            extractText(content);

        this.type =
            getMessageType(content);

        this.mtype =
            this.type;

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

        /*
         * Pass the VoltageMessage instance so
         * permissions.js can inspect the connected
         * WhatsApp account.
         */
        this.isOwner =
            isOwner(
                this.sender,
                this
            );

        this.isDev =
            isDev(
                this.sender
            );

        this.isAdmin =
            false;

        this.isBotAdmin =
            false;

        this.isGroupOwner =
            false;

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

        this.isButtonResponse =
            [
                "buttonResponse",
                "listResponse",
                "templateButtonResponse",
                "interactiveResponse"
            ].includes(
                this.type
            );

        this.buttonId =
            content?.buttonsResponseMessage
                ?.selectedButtonId ||
            content?.listResponseMessage
                ?.singleSelectReply
                ?.selectedRowId ||
            content?.templateButtonReplyMessage
                ?.selectedId ||
            null;

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


    async loadPermissions() {
        if (!this.isGroup) {
            return;
        }

        const participants =
            this.groupMetadata
                ?.participants || [];

        const normalize =
            jid =>
                normalizeJid(jid);

        const senderParticipant =
            participants.find(
                participant =>
                    normalize(
                        participant?.id
                    ) === normalize(
                        this.sender
                    )
            );

        const botJid =
            normalizeJid(
                this.sock?.user?.id
            );

        const botParticipant =
            participants.find(
                participant =>
                    normalize(
                        participant?.id
                    ) === botJid
            );

        this.isAdmin =
            Boolean(
                senderParticipant?.admin === "admin" ||
                senderParticipant?.admin === "superadmin" ||
                this.isOwner
            );

        this.isBotAdmin =
            Boolean(
                botParticipant?.admin === "admin" ||
                botParticipant?.admin === "superadmin"
            );

        this.isGroupOwner =
            senderParticipant?.admin === "superadmin";
    }


    async reply(
        content,
        options = {}
    ) {
        return this.sock.sendMessage(
            this.from,
            {
                text:
                    String(content)
            },
            {
                quoted:
                    this.raw,
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
                text:
                    content
            };
        } else {
            message =
                content;
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
                text:
                    String(content),

                edit:
                    messageKey
            },
            options
        );
    }


    async react(emoji) {
        return this.sock.sendMessage(
            this.from,
            {
                react: {
                    text:
                        emoji,

                    key:
                        this.key
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
                forward:
                    this.raw
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

            type =
                "image";
        } else if (
            this.body.videoMessage
        ) {
            media =
                this.body.videoMessage;

            type =
                "video";
        } else if (
            this.body.audioMessage
        ) {
            media =
                this.body.audioMessage;

            type =
                "audio";
        } else if (
            this.body.documentMessage
        ) {
            media =
                this.body.documentMessage;

            type =
                "document";
        } else if (
            this.body.stickerMessage
        ) {
            media =
                this.body.stickerMessage;

            type =
                "sticker";
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
        return null;
    }

    const message =
        new VoltageMessage(
            sock,
            raw
        );

    if (message.isGroup) {
        await message.loadGroupMetadata();
        await message.loadPermissions();
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
