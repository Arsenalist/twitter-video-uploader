import {getVideoDurationInSeconds} from 'get-video-duration'
import {SocketServerWrapper} from "./socketServerWrapper";
import {createThumbnailPath, createThumbnailPathFromWebRoot} from "./videoFilePaths";
const fs = require('fs');

function isFileNewEnough(newDetectedFile: string) {
    const stat = fs.statSync(newDetectedFile);
    const thirtySeconds = 30 * 1000;
    return new Date().getTime() - stat.mtime <= thirtySeconds;
}

export const fileDetectedHandler = async (newDetectedFile: string, wrapper: SocketServerWrapper, web_client_dir: string) => {
    console.log("new file found", newDetectedFile);
    let completeFile = false
    let newEnough = false
    try {
        // this call fails if the file is being written to which is what we want as we don't want
        // to process incomplete files
        await getVideoDurationInSeconds(newDetectedFile);
        completeFile = true
    } catch (e) {
        console.log("incomplete file found, skipping", newDetectedFile);
    }
    newEnough = isFileNewEnough(newDetectedFile);
    if (!completeFile || !newEnough) {
        return;
    }
    try {
        let thumb = createThumbnailPath(web_client_dir, newDetectedFile);
        fs.copyFileSync(newDetectedFile, thumb)
        wrapper.send(JSON.stringify({
            action: "tweetRequest",
            id: newDetectedFile,
            thumb: createThumbnailPathFromWebRoot(thumb)
        }))
        console.log("processed", newDetectedFile);
    } catch (e) {
        console.log("encountered an error processing file", newDetectedFile, e);
    }
}
