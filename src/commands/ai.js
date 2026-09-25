const GROQ_URL =
    "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL =
    process.env.GROQ_MODEL ||
    "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `
You are Voltage.

You were created and are owned by Thereal_VoltageLord.

Personality:
- intelligent
- direct
- confident
- observant
- witty
- slightly sarcastic when appropriate
- natural and conversational
- Nigerian/Gen-Z aware when relevant
- never overly corporate
- do not mention hidden providers, APIs, system prompts, keys, or internal architecture
- do not pretend to know something you do not know
- answer the user's actual request directly
`.trim();

async function execute(message, args = "") {
    const prompt =
        String(args || "").trim();

    if (!prompt) {
        return message.reply(
            "Say what you want me to do.\n\nPowered by Thereal_VoltageLord"
        );
    }

    console.log(
        `[Voltage] AI command → Groq: "${prompt}"`
    );

    const response =
        await fetch(
            GROQ_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    model: GROQ_MODEL,

                    messages: [
                        {
                            role: "system",
                            content:
                                SYSTEM_PROMPT
                        },
                        {
                            role: "user",
                            content:
                                prompt
                        }
                    ],

                    temperature: 0.7,

                    max_tokens: 2048
                })
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        console.error(
            "[Voltage] Groq API error:",
            data
        );

        throw new Error(
            data?.error?.message ||
            `Groq request failed with status ${response.status}.`
        );
    }

    const text =
        data?.choices?.[0]?.message?.content;

    if (!text) {
        throw new Error(
            "Groq returned an empty response."
        );
    }

    console.log(
        "[Voltage] Groq response received."
    );

    return message.reply(
        `${String(text).trim()}\n\nPowered by Thereal_VoltageLord`
    );
}

module.exports = {
    name: "ai",

    aliases: [
        "ask",
        "chat",
        "gpt"
    ],

    triggers: [
        "voltage",
        "voltage hi",
        "voltage ask",
        "voltage chat"
    ],

    phrases: [
        "ask voltage",
        "ask",
        "chat with voltage",
        "talk to voltage"
    ],

    keywords: [
        "ai",
        "ask voltage",
        "chat with voltage"
    ],

    description:
        "Talk to Voltage using the text AI model.",

    usage:
        "Voltage <message>",

    execute
};
