const {
buildPrompt
} = require("./prompt");

const {
route
} = require("./brainRouter");

async function ask(options = {}) {
const {
text = "",
context = "",
includeCreator = false,
task = "general",
type
} = options;

const userText =
    String(text).trim();

if (!userText) {
    return {
        success: false,
        text: null,
        provider: null,
        model: null,
        type: null,
        error: "Empty AI request."
    };
}

const systemPrompt =
    buildPrompt({
        text: "",
        context,
        includeCreator,
        task
    });

const result =
    await route({
        prompt: userText,
        systemPrompt,
        type
    });

if (!result?.success) {
    return {
        success: false,
        text: null,
        provider:
            result?.provider || null,
        model:
            result?.model || null,
        type:
            result?.type || null,
        error:
            result?.error ||
            "Voltage AI is temporarily unavailable."
    };
}

return {
    success: true,
    text: result.text,
    provider: result.provider,
    model: result.model,
    type: result.type
};

}

module.exports = {
ask
};
