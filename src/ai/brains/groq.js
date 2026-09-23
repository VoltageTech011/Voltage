const GROQ_URL =
"https://api.groq.com/openai/v1/chat/completions";

const MODEL =
"openai/gpt-oss-120b";

async function requestGroq(prompt, options = {}) {
const timeout =
Number(options.timeout || 60000);

const controller =
    new AbortController();

const timer =
    setTimeout(
        () => controller.abort(),
        timeout
    );

try {
    const response =
        await fetch(
            GROQ_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    model: MODEL,

                    messages: [
                        {
                            role: "system",
                            content:
                                options.systemPrompt ||
                                "You are Voltage."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                }),

                signal:
                    controller.signal
            }
        );

    if (!response.ok) {
        throw new Error(
            `Groq HTTP ${response.status}`
        );
    }

    let data;

    try {
        data =
            await response.json();
    } catch {
        throw new Error(
            "Groq returned invalid JSON."
        );
    }

    const text =
        data?.choices?.[0]?.message?.content;

    if (
        typeof text !== "string" ||
        !text.trim()
    ) {
        throw new Error(
            "Groq returned an empty response."
        );
    }

    return {
        success: true,
        text: text.trim(),
        provider: "groq",
        model: MODEL,
        type: "text"
    };
} catch (error) {
    return {
        success: false,
        text: null,
        provider: "groq",
        model: MODEL,
        type: "text",
        error:
            error?.name === "AbortError"
                ? "Groq request timed out."
                : error.message
    };
} finally {
    clearTimeout(timer);
}

}

module.exports = {
requestGroq,
MODEL
};
