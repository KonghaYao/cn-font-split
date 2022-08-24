import fse from "fs-extra";

const SC = fse.readFileSync("./SC.txt", { encoding: "utf-8" });
const symbol = fse.readFileSync("./symbol.txt", { encoding: "utf-8" });
const TCDiff = fse.readFileSync("./TCDiff.txt", { encoding: "utf-8" });
fse.outputJSON("./words.json", [
    symbol.split("").map((i) => {
        return i.charCodeAt(0);
    }),
    SC.split("").map((i) => {
        return i.charCodeAt(0);
    }),
    TCDiff.split("")
        .filter((_, index) => {
            return index % 2;
        })
        .map((i) => {
            return i.charCodeAt(0);
        }),
]);
