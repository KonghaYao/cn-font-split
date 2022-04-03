import fs from "fs";

const SC = fs.readFileSync("./SC.txt", { encoding: "utf-8" });
const symbol = fs.readFileSync("./symbol.txt", { encoding: "utf-8" });
const TCDiff = fs.readFileSync("./TCDiff.txt", { encoding: "utf-8" });

fs.writeFileSync("./words.json", JSON.stringify({ SC, TCDiff, symbol }));
