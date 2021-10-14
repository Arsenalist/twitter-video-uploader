import {SocketServerWrapper} from "./socketServerWrapper";
import {appConfig} from "./config";
import {
  createThumbnailPath,
  createThumbnailPathFromWebRoot
} from "./videoFilePaths";
import {websocketMessageHandler} from "./messageHandler";
const fs = require('fs');

const { getVideoDurationInSeconds } = require('get-video-duration')
const watch = require('node-watch');

const wrapper = new SocketServerWrapper(websocketMessageHandler)

watch(appConfig.obs_watch_dir, { recursive: false, filter: (newDetectedFile: string) => {
    return !(fs.existsSync(newDetectedFile) && fs.lstatSync(newDetectedFile).isDirectory());
  } }, async (evt, newDetectedFile: string) => {
  if (evt === "update") {
    try {
      // this call fails if the file is being written to which is what we want as we don't want
      // to process incomplete files
      await getVideoDurationInSeconds(newDetectedFile)
    } catch (e) {
      console.log("incomplete file found, skipping", e)
    }
    let thumb = createThumbnailPath(appConfig.web_client_dir, newDetectedFile);
    fs.copyFileSync(newDetectedFile, thumb)
    wrapper.send(JSON.stringify({action: "tweetRequest", id: newDetectedFile, thumb: createThumbnailPathFromWebRoot(thumb)}))
  }
});
