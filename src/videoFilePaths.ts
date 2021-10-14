import {VideoSaveRequest} from "./videoSaveRequest";
const path = require('path');
const slugify = require('slugify');

export const slugifiedPath = (output_dir: string, text: string, file_path: string) => {
    return `${output_dir}/${slugify(text)}${path.extname(file_path)}`;
}

export const createNoAudioOutputPath = (output_no_audio_dir: string, text: string, file_path: string) => {
    return `${output_no_audio_dir}/${slugify(text)}${path.extname(file_path)}`;
}

export const createOutputPath = (output_dir: string, videoSaveRequest: VideoSaveRequest) => {
    return slugifiedPath(output_dir, videoSaveRequest.text, videoSaveRequest.id);
}

export const createThumbnailPath = (web_client_dir: string, file_path: string) => {
    return `${web_client_dir}/public/videos/${path.basename(file_path)}`;
}

export const createThumbnailPathFromWebRoot = (thumbnail_path: string) => {
    return `/videos/${path.basename(thumbnail_path)}`;
}
