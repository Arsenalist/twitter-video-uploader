import {SocketServerWrapper} from "./socketServerWrapper";
import {appConfig} from "./config";
import {websocketMessageHandler} from "./messageHandler";
import {fileDetectedHandler} from "./fileDetectedHandler";
const fs = require('fs');
const watch = require('node-watch');

const wrapper = new SocketServerWrapper(websocketMessageHandler)

const isDirectory = (newDetectedFile: string) => {
  return fs.existsSync(newDetectedFile) && fs.lstatSync(newDetectedFile).isDirectory();
}

watch(appConfig.obs_watch_dir, {
  recursive: false, filter: (newDetectedFile: string) => {
    return !isDirectory(newDetectedFile);
  }
}, async (evt, newDetectedFile: string) => {
  if (evt === "update") {
    await fileDetectedHandler(newDetectedFile, wrapper, appConfig.web_client_dir);
  }
});
