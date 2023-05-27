import { FontAnalyze } from "../dist/src/index.js";
import fse from "fs-extra";
const file = await fse.readFile("../../fonts/SmileySans-Oblique.ttf");
const data = FontAnalyze(file, "ttf");
await fse.outputJSON("dist/analyze.json", data);
