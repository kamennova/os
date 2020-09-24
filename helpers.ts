export const fillString = (str: string, size: number, char: string) => {
    if(str.length > size){
        return str.substr(-1, size);
    }

    return new Array(size - str.length + 1).join(char) + str;
};
