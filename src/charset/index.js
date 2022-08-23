import fs from "fs";

const SC = fs.readFileSync("./SC.txt", { encoding: "utf-8" });
const symbol = fs.readFileSync("./symbol.txt", { encoding: "utf-8" });
const TCDiff = fs.readFileSync("./TCDiff.txt", { encoding: "utf-8" });

fs.writeFileSync(
    "./words.json",
    JSON.stringify([
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
    ])
);
