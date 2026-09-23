const {
requestGroq
} = require("./brains/groq");

const {
requestThinking
} = require("./brains/thinking");

const {
requestSearch
} = require("./brains/search");

const {
requestImage
} = require("./brains/image");

const {
requestVideo
} = require("./brains/video");

const {
requestAudio
} = require("./brains/audio");

const {
requestDocument
} = require("./brains/document");

function classifyRequest(text) {
const value =
String(text || "")
.trim()
.toLowerCase();

if (!value) {
    return "text";
}

const searchPatterns = [
    "latest",
    "today",
    "current",
    "right now",
    "news",
    "recent",
    "this week",
    "this month",
    "search the web",
    "look it up",
    "on the internet",
    "what happened"
];

if (
    searchPatterns.some(
        pattern =>
            value.includes(pattern)
    )
) {
    return "search";
}

const reasoningPatterns = [
    "debug",
    "debugging",
    "analyze",
    "analysis",
    "explain why",
    "why does",
    "why is",
    "solve",
    "prove",
    "compare",
    "architecture",
    "design a system",
    "plan",
    "step by step",
    "how should i build",
    "find the bug"
];

if (
    reasoningPatterns.some(
        pattern =>
            value.includes(pattern)
    )
) {
    return "reasoning";
}

return "text";

}

async function route(options = {}) {
const {
prompt = "",
systemPrompt = "",
type,
mediaUrl,
mime
} = options;

const requestType =
    type || classifyRequest(prompt);

if (requestType === "reasoning") {
    const result =
        await requestThinking(
            `${systemPrompt}\n\nUSER REQUEST:\n${prompt}`
        );

    if (result.success) {
        return result;
    }

    return requestGroq(
        prompt,
        {
            systemPrompt
        }
    );
}

if (requestType === "search") {
    const result =
        await requestSearch(
            prompt
        );

    if (result.success) {
        return result;
    }

    return requestGroq(
        prompt,
        {
            systemPrompt
        }
    );
}

if (requestType === "image") {
    return requestImage(
        prompt,
        mediaUrl
    );
}

if (requestType === "video") {
    return requestVideo(
        prompt,
        mediaUrl,
        mime
    );
}

if (requestType === "audio") {
    return requestAudio(
        prompt,
        mediaUrl,
        mime
    );
}

if (requestType === "document") {
    return requestDocument(
        prompt,
        mediaUrl
    );
}

return requestGroq(
    prompt,
    {
        systemPrompt
    }
);

}

module.exports = {
route,
classifyRequest
};
