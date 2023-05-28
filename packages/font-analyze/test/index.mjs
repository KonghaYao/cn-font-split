import { FontAnalyze } from "../dist/index.js";
import fse from "fs-extra";
const file = await fse.readFile("../../fonts/鸿雷行书简体.ttf");
const data = FontAnalyze(file, "ttf");
await fse.outputJSON("dist/analyze.json", data);
