import {saveReplayKeyboardShortcut, saveVideStopAndStartKeyboardShortcut} from "./keyTaps";
import {deleteThumbnail, saveAndSendTweet, saveForLater} from "./controller";

export const websocketMessageHandler = (message) => {
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
