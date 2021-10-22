import {createThumbnailPathFromWebRoot} from "./videoFilePaths";

export const infoMessage = (message: string): string => {
    return JSON.stringify({ action: "infoMessage", message: message});
}

export const videoInfoRequest = (id: string, thumb: string): string => {
    return JSON.stringify({
        action: "videoInfoRequest",
        id: id,
        thumb: thumb
    })
}
