import {
    createOutputPath,
    createThumbnailPath,
    createThumbnailPathFromWebRoot
} from "./videoFilePaths";
import {VideoSaveRequest} from "./videoSaveRequest";

describe('createOutputPath', () => {
    it ('create output path', ()=> {
        const videoSaveRequest: VideoSaveRequest=  {
            text: 'description of file',
            id: '/usr/local/video.mp4'
        }
        expect(createOutputPath("/usr/local/output-dir", videoSaveRequest)).toEqual("/usr/local/output-dir/description-of-file.mp4")
    })
    it ('create output path with tag prepended when tag is provided', ()=> {
        const videoSaveRequest: VideoSaveRequest=  {
            text: 'description of file',
            id: '/usr/local/video.mp4',
            tag: 'my-tag'
        }
        expect(createOutputPath("/usr/local/output-dir", videoSaveRequest)).toEqual("/usr/local/output-dir/my-tag-description-of-file.mp4")
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
