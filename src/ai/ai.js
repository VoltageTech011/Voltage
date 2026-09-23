const {
    route
} = require("./brainRouter");

const {
    buildSystemPrompt
} = require("./prompt");

async function generateResponse(message) {
    if (!message) {
        return {
            success: false,
            text: null,
            error: "Message is unavailable."
        };
    }

    const prompt =
        String(message.text || "").trim();

    if (!prompt) {
        return {
            success: false,
            text: null,
            error: "Empty prompt."
        };
    }

    const systemPrompt =
        buildSystemPrompt(message);

    let type = null;
    let mediaUrl = null;
    let mime = null;

    if (message.type === "image") {
        type = "image";
        mediaUrl =
            message.mediaUrl ||
            null;
        mime =
            message.mimetype ||
            null;
    }

    if (message.type === "video") {
        type = "video";
        mediaUrl =
            message.mediaUrl ||
            null;
        mime =
            message.mimetype ||
            null;
    }

    if (message.type === "audio") {
        type = "audio";
        mediaUrl =
            message.mediaUrl ||
            null;
        mime =
            message.mimetype ||
            null;
    }

    if (message.type === "document") {
        type = "document";
        mediaUrl =
            message.mediaUrl ||
            null;
        mime =
            message.mimetype ||
            null;
    }

    try {
        const result =
            await route({
                prompt,
                systemPrompt,
                type,
                mediaUrl,
                mime
            });

        if (!result) {
            return {
                success: false,
                text: null,
                error: "Voltage received no AI response."
            };
        }

        if (!result.success) {
            return result;
        }

        return {
            success: true,
            text: String(
                result.text || ""
            ).trim(),
            provider:
                result.provider || "unknown",
            model:
                result.model || null,
            type:
                result.type || type || "text"
        };
    } catch (error) {
        console.error(
            "[Voltage] AI error:",
            error
        );

        return {
            success: false,
            text: null,
            provider: null,
            error:
                error.message ||
                "Voltage AI failed."
        };
    }
}

module.exports = {
    generateResponse
};
