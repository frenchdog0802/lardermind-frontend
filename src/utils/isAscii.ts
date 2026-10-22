/** True when every code unit is in the ASCII range. */
export function isAscii(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        if (value.charCodeAt(index) > 127) return false;
    }
    return true;
}
