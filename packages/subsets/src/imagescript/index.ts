import { makeImage as MakeImageLocal } from './image.local'
import { makeImage as MakeImageThread } from './image.worker'
export const makeImage = async (
    ttfFile: Uint8Array,
    text = "中文网字计划\nThe Project For Web",
    level = 9, threads: boolean = false
) => {
    if (threads) {
        return MakeImageThread(ttfFile, text, level)
    }
    return MakeImageLocal(ttfFile, text, level)
};
