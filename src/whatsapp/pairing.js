const normalizeNumber = (value) => {
    if (!value) return "";

    return String(value)
        .replace(/\D/g, "")
        .replace(/^0+/, "");
};

const isValidPhoneNumber = (value) => {
    const number = normalizeNumber(value);
    return number.length >= 8 && number.length <= 15;
};

module.exports = {
    normalizeNumber,
    isValidPhoneNumber
};
