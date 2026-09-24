function extractText(data) {
    if (!data) {
        return null;
    }

    if (
        typeof data === "string"
    ) {
        return data.trim() || null;
    }

    if (
        typeof data.BK9 === "string"
    ) {
        return data.BK9.trim() || null;
    }

    if (
        typeof data.response === "string"
    ) {
        return data.response.trim() || null;
    }

    if (
        typeof data.text === "string"
    ) {
        return data.text.trim() || null;
    }

    if (
        typeof data.result === "string"
    ) {
        return data.result.trim() || null;
    }

    if (
        Array.isArray(data.choices)
    ) {
        const content =
            data.choices[0]
                ?.message
                ?.content;

        if (
            typeof content === "string"
        ) {
            return content.trim() || null;
        }
    }

    return null;
}

function success(
    data,
    provider,
    type = "text",
    model = null
) {
    const text =
        extractText(data);

    if (!text) {
        return {
            success: false,
            text: null,
            provider,
            type,
            model,
            error:
                "The AI provider returned an empty response."
        };
    }

    return {
        success: true,
        text,
        provider,
        type,
        model
    };
}

function failure(
    provider,
    error,
    type = "text",
    model = null
) {
    return {
        success: false,
        text: null,
        provider,
        type,
        model,
        error:
            error?.message ||
            String(error) ||
            "AI request failed."
    };
}

module.exports = {
    extractText,
    success,
    failure
};
