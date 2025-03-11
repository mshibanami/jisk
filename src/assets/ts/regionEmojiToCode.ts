export function convertRegionEmojiToCode(regionEmoji: string): string {
    const codePoints = Array.from(regionEmoji)
    if (codePoints.length !== 2) {
        throw new Error("The input must be a 2-character flag emoji.");
    }
    const OFFSET = 0x1F1E6;
    return codePoints.map((char) => {
        const codePoint = char.codePointAt(0);
        if (!codePoint) {
            throw new Error("Invalid character is included in the input");
        }
        return String.fromCharCode(codePoint - OFFSET + 65);
    }).join('');
}
