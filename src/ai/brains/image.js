const IMAGE_URL =
"https://api.bk9.dev/ai/geminiimg";

async function requestImage(prompt, imageUrl, options = {}) {
if (!imageUrl) {
return {
success: false,
text: null,
provider: "bk9",
model: "gemini-image",
type: "image",
error: "Image URL is required."
};
}

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
            q: String(prompt || "Analyze this image."),
            url: String(imageUrl)
        });

    const response =
        await fetch(
            `${IMAGE_URL}?${params}`,
            {
                method: "GET",
                signal: controller.signal
            }
        );

    if (!response.ok) {
        throw new Error(
            `Image HTTP ${response.status}`
        );
    }

    const data =
        await response.json();

    const text =
        extractText(data);

    if (!text) {
        throw new Error(
            "Image endpoint returned no usable answer."
        );
    }

    return {
        success: true,
        text,
        provider: "bk9",
        model: "gemini-image",
        type: "image"
    };
} catch (error) {
    return {
        success: false,
        text: null,
        provider: "bk9",
        model: "gemini-image",
        type: "image",
        error:
            error?.name === "AbortError"
                ? "Image analysis timed out."
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
requestImage
};
