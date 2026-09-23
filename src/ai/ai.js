const {
    routeBrain
} = require("./brainRouter");

async function generateResponse(
    message
) {
    if (!message) {
        throw new Error(
            "AI message is required."
        );
    }

    const text =
        String(message.text || "")
            .trim();

    if (!text) {
        return null;
    }

    const result =
        await routeBrain({
            message,
            prompt: text
        });

    if (!result?.success) {
        console.error(
            "[Voltage] AI generation failed:",
            result?.error || "Unknown error"
        );

        return null;
    }

    const response =
        String(result.text || "")
            .trim();

    if (!response) {
        return null;
    }

    return response;
}

module.exports = {
    generateResponse
};
