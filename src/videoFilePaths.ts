import {VideoSaveRequest} from "./videoSaveRequest";
const path = require('path');
const slugify = require('slugify');

export const createNoAudioOutputPath = (output_no_audio_dir: string, text: string, file_path: string) => {
    let newText = ""
    if (text === undefined || text.trim() === "") {
        newText = "no-name"
    } else {
        newText = text
    }
    return `${output_no_audio_dir}/${slugify(newText)}${path.extname(file_path)}`;
}

export const createOutputPath = (output_dir: string, videoSaveRequest: VideoSaveRequest) => {
    let text = ""
    if (videoSaveRequest.text === undefined || videoSaveRequest.text.trim() === "") {
        text = "no-name"
    } else {
        text = videoSaveRequest.text
    }
    return slugifiedPath(output_dir, text, videoSaveRequest.id);
}

export const createThumbnailPath = (web_client_dir: string, file_path: string) => {
    return `${web_client_dir}/public/videos/${path.basename(file_path)}`;
}

export const createThumbnailPathFromWebRoot = (thumbnail_path: string) => {
    return `/videos/${path.basename(thumbnail_path)}`;
}

const slugifiedPath = (output_dir: string, text: string, file_path: string) => {
    return `${output_dir}/${slugify(text)}${path.extname(file_path)}`;
}
