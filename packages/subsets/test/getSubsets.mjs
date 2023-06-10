import { getSubsetsFromCSS } from "../dist/index.js";
import fs from "fs-extra";
fetch(
    "https://cdn.jsdelivr.net/gh/dsrkafuu/misans/lib/misans-400-regular.min.css"
)
    .then((res) => res.text())
    .then((res) => {
        return getSubsetsFromCSS(res);
    })
    .then((subsets) => {
        fs.outputJSON("./subsets/misans.json", subsets);
    });
