import {getVideoDurationInSeconds} from 'get-video-duration'
import {SocketServerWrapper} from "./socketServerWrapper";
import {createThumbnailPath, createThumbnailPathFromWebRoot} from "./videoFilePaths";
const fs = require('fs');

export const fileDetectedHandler = async (newDetectedFile: string, wrapper: SocketServerWrapper, web_client_dir: string) => {
    console.log("new file found", newDetectedFile);
    let processFile = false
    try {
        // this call fails if the file is being written to which is what we want as we don't want
        // to process incomplete files
        await getVideoDurationInSeconds(newDetectedFile);
        processFile = true
    } catch (e) {
        console.log("incomplete file found, skipping", newDetectedFile);
    }
    if (!processFile) {
        return;
    }
    let thumb = createThumbnailPath(web_client_dir, newDetectedFile);
    fs.copyFileSync(newDetectedFile, thumb)
    wrapper.send(JSON.stringify({
        action: "tweetRequest",
        id: newDetectedFile,
        thumb: createThumbnailPathFromWebRoot(thumb)
    }))
    console.log("processed", newDetectedFile);
}
