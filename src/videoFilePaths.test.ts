import {
    createNoAudioOutputPath,
    createOutputPath,
    createThumbnailPath,
    createThumbnailPathFromWebRoot
} from "./videoFilePaths";
import {VideoSaveRequest} from "./videoSaveRequest";

describe('createNoAudioOutputPath', () => {
    it ('creates the no audio path for an mp4 file', ()=> {
        expect(createNoAudioOutputPath("/usr/local/no-audio-dir", "my text string", "/usr/dir/file.mp4")).toEqual("/usr/local/no-audio-dir/my-text-string.mp4")
    })
    it ('creates the no audio path for an mkv file', ()=> {
        expect(createNoAudioOutputPath("/usr/local/no-audio-dir", "my text string", "/usr/dir/file.mkv")).toEqual("/usr/local/no-audio-dir/my-text-string.mkv")
    })
    it ('creates the no audio path for a file with no extension', ()=> {
        expect(createNoAudioOutputPath("/usr/local/no-audio-dir", "my text string", "/usr/dir/file")).toEqual("/usr/local/no-audio-dir/my-text-string")
    })
    it ('creates the no audio path for a file called no-name when no text provided', ()=> {
        expect(createNoAudioOutputPath("/usr/local/no-audio-dir", "", "/usr/dir/file.mp4")).toEqual("/usr/local/no-audio-dir/no-name.mp4")
    })
})

describe('createOutputPath', () => {
    it ('create output path', ()=> {
        const videoSaveRequest: VideoSaveRequest=  {
            text: 'description of file',
            id: '/usr/local/video.mp4'
        }
        expect(createOutputPath("/usr/local/output-dir", videoSaveRequest)).toEqual("/usr/local/output-dir/description-of-file.mp4")
    })
    it ('crates a file called no-name.mp4 when no description is provided', ()=> {
        const videoSaveRequest: VideoSaveRequest=  {
            text: '',
            id: '/usr/local/video.mp4'
        }
        expect(createOutputPath("/usr/local/output-dir", videoSaveRequest)).toEqual("/usr/local/output-dir/no-name.mp4")
    })
})

describe('createThumbnailPath', () => {
    it ('creates thumbnail path', ()=> {
        expect(createThumbnailPath("/usr/local/web-dir", "/path/to/file.mp4")).toEqual("/usr/local/web-dir/public/videos/file.mp4")
    })
})

describe('createThumbnailPathFromWebRoot', () => {
    it ('creates thumbnail path absolute to web root', ()=> {
        expect(createThumbnailPathFromWebRoot("/path/to/file.mp4")).toEqual("/videos/file.mp4")
    })
})
