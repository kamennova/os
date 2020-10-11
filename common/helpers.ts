export const fillString = (str: string, size: number, char: string) => {
    if (str.length > size) {
        return str.substr(-1, size);
    }

    return new Array(size - str.length + 1).join(char) + str;
};

export const clearBuffer = (view: DataView): void => {
    for (let i = 0; i < view.byteLength; i++) {
        view.setUint8(i, 0);
    }
};
