const fs = require('fs');
import {saveReplayKeyboardShortcut, saveVideStopAndStartKeyboardShortcut} from "./keyTaps";
import {FfmpegCommandFactory} from "./ffmpegCommandFactory";
import {FfmpegCommandExecutor} from "./ffmpegCommandExecutor";
import {VideoSaveRequest} from "./videoSaveRequest";
import {appConfig} from "./config";
import {createNoAudioOutputPath, createOutputPath, createThumbnailPath} from "./videoFilePaths";
import {VideoTweet} from "./videoTweet";

export const websocketMessageHandler = (message) => {
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

const saveWithNoAudio = (ffmpegCommandFactory: FfmpegCommandFactory, out_file, out_file_no_audio) => {
    const ffmpegExecutor = new FfmpegCommandExecutor()
    ffmpegExecutor.executeFfmpegCommand(ffmpegCommandFactory.createStripAudioCommand(out_file, out_file_no_audio))
}

const saveWithNiceName = (ffmpegCommandFactory: FfmpegCommandFactory, out_file_no_audio, out_file, videoSaveRequest: VideoSaveRequest) => {
    let ffmpegTrimCommand = ffmpegCommandFactory.creatTrimCommand(videoSaveRequest.in_point, videoSaveRequest.out_point, videoSaveRequest.id, out_file);
    if (ffmpegTrimCommand !== "") {
        const ffmpegExecutor = new FfmpegCommandExecutor()
        ffmpegExecutor.executeFfmpegCommand(ffmpegTrimCommand)
    } else {
        fs.copyFileSync(videoSaveRequest.id, out_file)
    }
    saveWithNoAudio(ffmpegCommandFactory, out_file, out_file_no_audio);
}

const saveForLater = (videoSaveRequest: VideoSaveRequest) => {
    const ffmpegCommandFactory = new FfmpegCommandFactory(appConfig.ffmpeg_binary)
    const out_file_no_audio = createNoAudioOutputPath(appConfig.output_noaudio_dir, videoSaveRequest.text, videoSaveRequest.id)
    const out_file = createOutputPath(appConfig.output_dir, videoSaveRequest)
    saveWithNiceName(ffmpegCommandFactory, out_file_no_audio, out_file, videoSaveRequest);
    deleteThumbnail(videoSaveRequest.id)
}

const saveAndSendTweet = (videoSaveRequest: VideoSaveRequest) => {
    const ffmpeg = new FfmpegCommandFactory(appConfig.ffmpeg_binary)
    const out_file_no_audio = createNoAudioOutputPath(appConfig.output_noaudio_dir, videoSaveRequest.text, videoSaveRequest.id)
    const out_file = createOutputPath(appConfig.output_dir, videoSaveRequest)
    saveWithNiceName(ffmpeg, out_file_no_audio, out_file, videoSaveRequest);
    new VideoTweet(appConfig.twitter, {
        file_path: out_file,
        tweet_text: videoSaveRequest.text
    });
    deleteThumbnail(videoSaveRequest.id)
}
const deleteThumbnail = (file_path: string) => {
    fs.unlink(createThumbnailPath(appConfig.web_client_dir, file_path), function(e) {
        if (e) {
            console.log("error cleaning up file_path from preview directory (don't worry about it)")
        }
    })
}
