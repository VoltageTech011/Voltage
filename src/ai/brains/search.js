const SEARCH_URL =
"https://api.bk9.dev/ai/perplexity";

async function requestSearch(query, options = {}) {
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
            q: String(query || "").trim()
        });

    const response =
        await fetch(
            `${SEARCH_URL}?${params}`,
            {
                method: "GET",
                signal: controller.signal
            }
        );

    if (!response.ok) {
        throw new Error(
            `Search HTTP ${response.status}`
        );
    }

    const data =
        await response.json();

    const text =
        extractText(data);

    if (!text) {
        throw new Error(
            "Search returned no usable answer."
        );
    }

    return {
        success: true,
        text,
        provider: "bk9",
        model: "perplexity",
        type: "search"
    };
} catch (error) {
    return {
        success: false,
        text: null,
        provider: "bk9",
        model: "perplexity",
        type: "search",
        error:
            error?.name === "AbortError"
                ? "Search request timed out."
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

const values = [
    data?.BK9,
    data?.answer,
    data?.response,
    data?.text,
    data?.result,
    data?.output,
    data?.content,
    data?.message
];

for (const value of values) {
    if (
        typeof value === "string" &&
        value.trim()
    ) {
        return value.trim();
    }
}

const choice =
    data?.choices?.[0]?.message?.content;

if (
    typeof choice === "string" &&
    choice.trim()
) {
    return choice.trim();
}

return "";

}

module.exports = {
requestSearch
};
