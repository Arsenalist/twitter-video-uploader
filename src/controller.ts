import {uploadToYouTube} from "./youtube";

const fs = require('fs');
import {FfmpegCommandFactory} from "./ffmpegCommandFactory";
import {FfmpegCommandExecutor} from "./ffmpegCommandExecutor";
import {VideoSaveRequest} from "./videoSaveRequest";
import {appConfig} from "./config";
import {createOutputPath, createThumbnailPath} from "./videoFilePaths";
import {VideoTweet} from "./videoTweet";
import {socketServerWrapper} from "./index";
import {infoMessage} from "./socketMessage";
const path = require('path');

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

export const saveForLater = (videoSaveRequest: VideoSaveRequest) => {
    setTimeout(() => {
        const ffmpegCommandFactory = new FfmpegCommandFactory(appConfig.ffmpeg_binary)
        const out_file_no_audio = createOutputPath(appConfig.output_noaudio_dir, videoSaveRequest)
        const out_file = createOutputPath(appConfig.output_dir, videoSaveRequest)
        saveWithNiceName(ffmpegCommandFactory, out_file_no_audio, out_file, videoSaveRequest);
        socketServerWrapper.send(infoMessage(`Saved file ${path.basename(out_file)}`));
        deleteThumbnail(videoSaveRequest.id)
    }, 0);
}

export const saveAndSendTweet = (videoSaveRequest: VideoSaveRequest) => {
    setTimeout(() => {
        const ffmpeg = new FfmpegCommandFactory(appConfig.ffmpeg_binary)
        const out_file_no_audio = createOutputPath(appConfig.output_noaudio_dir, videoSaveRequest)
        const out_file = createOutputPath(appConfig.output_dir, videoSaveRequest)
        saveWithNiceName(ffmpeg, out_file_no_audio, out_file, videoSaveRequest);
        new VideoTweet(appConfig.twitter, {
            file_path: out_file,
            tweet_text: videoSaveRequest.text
        });
        socketServerWrapper.send(infoMessage(`Tweeted file ${path.basename(out_file)}`));
        deleteThumbnail(videoSaveRequest.id)
    }, 0);
}

export const saveAndSendToYouTube = async (videoSaveRequest: VideoSaveRequest) => {
    setTimeout(async () => {
        const ffmpeg = new FfmpegCommandFactory(appConfig.ffmpeg_binary)
        const out_file_no_audio = createOutputPath(appConfig.output_noaudio_dir, videoSaveRequest)
        const out_file = createOutputPath(appConfig.output_dir, videoSaveRequest)
        saveWithNiceName(ffmpeg, out_file_no_audio, out_file, videoSaveRequest);
        await uploadToYouTube(appConfig.youtube, out_file, videoSaveRequest.text).then(() => {
            deleteThumbnail(videoSaveRequest.id)
        })
        socketServerWrapper.send(infoMessage(`Uploaded to YouTube ${path.basename(out_file)}`));
    }, 0);
}

export const deleteThumbnail = (file_path: string) => {
    fs.unlink(createThumbnailPath(appConfig.web_client_dir, file_path), function(e) {
        if (e) {
            console.log("error cleaning up file_path from preview directory (don't worry about it)")
        }
    })
}
