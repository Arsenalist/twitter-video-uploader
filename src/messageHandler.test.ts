import {websocketMessageHandler} from "./messageHandler"
jest.mock('./keyTaps')
jest.mock('./controller')
import {saveReplayKeyboardShortcut, saveVideStopAndStartKeyboardShortcut} from "./keyTaps"
import {deleteThumbnail, saveAndSendToYouTube, saveAndSendTweet, saveForLater} from "./controller"

describe('websocketMessageHandler', () => {

    it("calls saveReplayKeyboardShortcut when action is saveReplay", () => {
        websocketMessageHandler({type: "utf8", utf8Data: JSON.stringify({action: "saveReplay"})})
        expect(saveReplayKeyboardShortcut).toHaveBeenCalledTimes(1)
    })

    it("calls saveVideStopAndStartKeyboardShortcut when action is saveVideo", () => {
        websocketMessageHandler({type: "utf8", utf8Data: JSON.stringify({action: "saveVideo"})})
        expect(saveVideStopAndStartKeyboardShortcut).toHaveBeenCalledTimes(1)
    })

    it("calls saveAndSendTweet when action is saveAndSendTweet", () => {
        const messagePayload = {action: "saveAndSendTweet"};
        websocketMessageHandler({type: "utf8", utf8Data: JSON.stringify(messagePayload)})
        expect(saveAndSendTweet).toHaveBeenCalledTimes(1)
        expect(saveAndSendTweet).toHaveBeenCalledWith(messagePayload)
    })

    it("calls saveAndSendTweet when action is saveAndSendToYouTube", () => {
        const messagePayload = {action: "saveAndSendToYouTube"};
        websocketMessageHandler({type: "utf8", utf8Data: JSON.stringify(messagePayload)})
        expect(saveAndSendToYouTube).toHaveBeenCalledTimes(1)
        expect(saveAndSendToYouTube).toHaveBeenCalledWith(messagePayload)
    })

    it("calls saveForLater when action is saveVideoWithNameOnly", () => {
        const messagePayload = {action: "saveVideoWithNameOnly"};
        websocketMessageHandler({type: "utf8", utf8Data: JSON.stringify(messagePayload)})
        expect(saveForLater).toHaveBeenCalledTimes(1)
        expect(saveForLater).toHaveBeenCalledWith(messagePayload)
    })

    it("calls deleteThumbnail when action is clearVideo", () => {
        const messagePayload = {action: "clearVideo", id: "/path/to/file.mp4"};
        websocketMessageHandler({type: "utf8", utf8Data: JSON.stringify(messagePayload)})
        expect(deleteThumbnail).toHaveBeenCalledTimes(1)
        expect(deleteThumbnail).toHaveBeenCalledWith(messagePayload.id)
    })
})
