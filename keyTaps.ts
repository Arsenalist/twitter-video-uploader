const robot = require("robotjs");

export const saveReplayKeyboardShortcut = () => {
    robot.keyTap("s", ["control", "shift"]);
};

export const saveVideStopAndStartKeyboardShortcut = () => {
    robot.keyTap("e", ["control", "alt", "shift"]);
    setTimeout(() => robot.keyTap("f", ["control", "alt", "shift"]), 3000);
};

