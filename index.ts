import {VideoTweet} from "./videoTweet";
import {SocketServerWrapper} from "./socketServerWrapper";
import {FfmpegCommandFactory} from "./ffmpegCommandFactory";
import {FfmpegCommandExecutor} from "./ffmpegCommandExecutor";
import {saveReplayKeyboardShortcut, saveVideStopAndStartKeyboardShortcut} from "./keyTaps";
import {appConfig} from "./config";
import {VideoSaveRequest} from "./videoSaveRequest";
import {
  createNoAudioOutputPath,
  createOutputPath,
  createThumbnailPath,
  createThumbnailPathFromWebRoot
} from "./videoFilePaths";

const fs = require('fs');
const { getVideoDurationInSeconds } = require('get-video-duration')

const path = require('path');
const watch = require('node-watch');

const watchDirectory = appConfig.obs_watch_dir;

function messageHandler(message) {
  console.log("message is ", message)
  const data = JSON.parse(message.utf8Data)

  if (message.type === 'utf8') {
    if (data.action === "saveReplay") {
      saveReplayKeyboardShortcut();
    } else if (data.action === "saveVideo") {
      saveVideStopAndStartKeyboardShortcut();
    } else if (data.action === "saveAndSendTweet") {
      saveAndSendTweet(data);
    } else if (data.action === "saveVideoWithNameOnly") {
      saveForLater(data);
    } else if (data.action === "clearVideo") {
      deleteThumbnail(data.id)
    }
  }
}

const wrapper = new SocketServerWrapper(messageHandler)


function saveWithNoAudio(ffmpegCommandFactory: FfmpegCommandFactory, out_file, out_file_no_audio) {
  const ffmpegExecutor = new FfmpegCommandExecutor()
  ffmpegExecutor.executeFfmpegCommand(ffmpegCommandFactory.createStripAudioCommand(out_file, out_file_no_audio))
}

function saveWithNiceName(ffmpegCommandFactory: FfmpegCommandFactory, out_file_no_audio, out_file, videoSaveRequest: VideoSaveRequest) {
  let ffmpegTrimCommand = ffmpegCommandFactory.creatTrimCommand(videoSaveRequest.in_point, videoSaveRequest.out_point, videoSaveRequest.id, out_file);
  if (ffmpegTrimCommand !== "") {
    const ffmpegExecutor = new FfmpegCommandExecutor()
    ffmpegExecutor.executeFfmpegCommand(ffmpegTrimCommand)
  } else {
    fs.copyFileSync(videoSaveRequest.id, out_file)
  }
  saveWithNoAudio(ffmpegCommandFactory, out_file, out_file_no_audio);
}

function saveForLater(videoSaveRequest: VideoSaveRequest) {
  const ffmpegCommandFactory = new FfmpegCommandFactory(appConfig.ffmpeg_binary)
  const out_file_no_audio = createNoAudioOutputPath(appConfig.output_noaudio_dir, videoSaveRequest.text, videoSaveRequest.id)
  const out_file = createOutputPath(appConfig.output_dir, videoSaveRequest)
  saveWithNiceName(ffmpegCommandFactory, out_file_no_audio, out_file, videoSaveRequest);
  deleteThumbnail(videoSaveRequest.id)
}

function saveAndSendTweet(videoSaveRequest: VideoSaveRequest) {
  const ffmpeg = new FfmpegCommandFactory(appConfig.ffmpeg_binary)
  const out_file_no_audio = createNoAudioOutputPath(appConfig.output_noaudio_dir, videoSaveRequest.text, videoSaveRequest.id)
  const out_file = createOutputPath(appConfig.output_dir, videoSaveRequest)
  saveWithNiceName(ffmpeg, out_file_no_audio, out_file, videoSaveRequest);
  new VideoTweet({
    file_path: out_file,
    tweet_text: videoSaveRequest.text
  });
  deleteThumbnail(videoSaveRequest.id)
}

function deleteThumbnail(file_path: string) {
  fs.unlink(createThumbnailPath(appConfig.web_client_dir, file_path), function(e) {
    if (e) {
      console.log("error cleaning up file_path from preview directory (don't worry about it)")
    }
  })
}

watch(watchDirectory, { recursive: false, filter: (newDetectedFile: string) => {
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
