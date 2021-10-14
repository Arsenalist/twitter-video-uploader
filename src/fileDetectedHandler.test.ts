jest.mock('fs')
const m = jest.doMock('get-video-duration', () => {
    return {getVideoDurationInSeconds: jest.fn()}
})
jest.mock('./socketServerWrapper')

import {fileDetectedHandler} from "./fileDetectedHandler";
import {SocketServerWrapper} from "./socketServerWrapper";
import { getVideoDurationInSeconds} from "get-video-duration";


const fs = require('fs');

describe('fileDetectedHandler', () => {
    it("valid file which is successfully copied and tweet request sent", async ()=> {
       const socketServerWrapper = new SocketServerWrapper(()=>{});
       socketServerWrapper.send = jest.fn();
        await fileDetectedHandler('/my/new/file.mp4', socketServerWrapper, '/web/dir');
       (getVideoDurationInSeconds as jest.Mock).mockResolvedValue(35);
       expect(fs.copyFileSync).toHaveBeenCalledWith('/my/new/file.mp4', '/web/dir/public/videos/file.mp4');
       expect(socketServerWrapper.send).toHaveBeenCalledWith(JSON.stringify({action: "tweetRequest", id: "/my/new/file.mp4", thumb: "/videos/file.mp4"}));
    })
})
