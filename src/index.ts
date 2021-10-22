import {SocketServerWrapper} from "./socketServerWrapper";
import {appConfig} from "./config";
import {websocketMessageHandler} from "./messageHandler";
import {fileDetectedHandler} from "./fileDetectedHandler";
const fs = require('fs');
const watch = require('node-watch');

export let socketServerWrapper;

const isDirectory = (newDetectedFile: string) => {
  return fs.existsSync(newDetectedFile) && fs.lstatSync(newDetectedFile).isDirectory();
}

const startSocketServer = () => {
  socketServerWrapper = new SocketServerWrapper(websocketMessageHandler);
}

const watchFolder = () => {
  watch(appConfig.obs_watch_dir, {
  recursive: false, filter: (newDetectedFile: string) => {
    return !isDirectory(newDetectedFile);
  }
}, async (evt, newDetectedFile: string) => {
  if (evt === "update") {
    await  fileDetectedHandler(newDetectedFile, socketServerWrapper, appConfig.web_client_dir);
  }
})};

if (require.main === module) {
  startSocketServer();
  watchFolder();
}
