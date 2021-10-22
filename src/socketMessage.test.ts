import {infoMessage, videoInfoRequest} from "./socketMessage";

describe('socketMessage', () => {

    it('info message is created', () => {
        expect(infoMessage('my message')).toEqual(`{"action":"infoMessage","message":"my message"}`)
    })
    it('videoInfoRequest message is created', () => {
        expect(videoInfoRequest("my-id", "my-thumb")).toEqual(`{"action":"videoInfoRequest","id":"my-id","thumb":"my-thumb"}`)
    })
});
