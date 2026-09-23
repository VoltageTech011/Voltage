const VIDEO_URL =
"https://api.bk9.dev/ai/gemini-video";

async function requestVideo(
prompt,
videoUrl,
mime = "video/mp4",
options = {}
) {
if (!videoUrl) {
return {
success: false,
text: null,
provider: "bk9",
model: "gemini-video",
type: "video",
error: "Video URL is required."
};
}

const timeout =
    Number(options.timeout || 120000);

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
            q: String(
                prompt ||
                "Analyze this video."
            ),
            url: String(videoUrl),
            mime: String(mime || "video/mp4")
        });

    const response =
        await fetch(
            `${VIDEO_URL}?${params}`,
            {
                method: "GET",
                signal: controller.signal
            }
        );

    if (!response.ok) {
        throw new Error(
            `Video HTTP ${response.status}`
        );
    }

    const data =
        await response.json();

    const text =
        extractText(data);

    if (!text) {
        throw new Error(
            "Video endpoint returned no usable answer."
        );
    }

    return {
        success: true,
        text,
        provider: "bk9",
        model: "gemini-video",
        type: "video"
    };
} catch (error) {
    return {
        success: false,
        text: null,
        provider: "bk9",
        model: "gemini-video",
        type: "video",
        error:
            error?.name === "AbortError"
                ? "Video analysis timed out."
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
requestVideo
};
