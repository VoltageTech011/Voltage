const GEMINI_THINKING_URL =
"https://api.bk9.dev/ai/gemini-thinking";

async function requestThinking(prompt, options = {}) {
const timeout =
Number(options.timeout || 90000);

const controller =
    new AbortController();

const timer =
    setTimeout(
        () => controller.abort(),
        timeout
    );

try {
    const params =
        new URLSearchParams({
            q: prompt,
            budget: "-1",
            includeThoughts: "true"
        });

    const response =
        await fetch(
            `${GEMINI_THINKING_URL}?${params}`,
            {
                method: "GET",
                signal:
                    controller.signal
            }
        );

    if (!response.ok) {
        throw new Error(
            `Thinking HTTP ${response.status}`
        );
    }

    let data;

    try {
        data =
            await response.json();
    } catch {
        throw new Error(
            "Thinking endpoint returned invalid JSON."
        );
    }

    const text =
        extractText(data);

    if (!text) {
        throw new Error(
            "Thinking endpoint returned no usable answer."
        );
    }

    return {
        success: true,
        text,
        provider: "bk9",
        model: "gemini-thinking",
        type: "reasoning"
    };
} catch (error) {
    return {
        success: false,
        text: null,
        provider: "bk9",
        model: "gemini-thinking",
        type: "reasoning",
        error:
            error?.name === "AbortError"
                ? "Thinking request timed out."
                : error.message
    };
} finally {
    clearTimeout(timer);
}

}

function extractText(data) {
if (typeof data === "string") {
return data.trim();
}

const candidates = [
    data?.BK9,
    data?.answer,
    data?.response,
    data?.text,
    data?.result,
    data?.message,
    data?.output,
    data?.content
];

for (const value of candidates) {
    if (
        typeof value === "string" &&
        value.trim()
    ) {
        return value.trim();
    }
}

const nested =
    data?.choices?.[0]?.message?.content;

if (
    typeof nested === "string" &&
    nested.trim()
) {
    return nested.trim();
}

return "";

}

module.exports = {
requestThinking
};
