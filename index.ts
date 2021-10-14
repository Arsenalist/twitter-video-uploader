import {VideoTweet} from "./videoTweet";
import {SocketServerWrapper} from "./socketServerWrapper";
const robot = require("robotjs");
const fs = require('fs');
const toml = require('toml');
const tomlData = toml.parse(fs.readFileSync('config.toml'));
const { getVideoDurationInSeconds } = require('get-video-duration')

const path = require('path');
const watch = require('node-watch');
const slugify = require('slugify');

const { execSync  } = require("child_process");

const ffmpeg = tomlData.ffmpeg_binary;
const watchDirectory = tomlData.obs_watch_dir;


function saveReplayKeyboardShortcut() {
  robot.keyTap("s", ["control", "shift"]);
}

function saveVideStopAndStartKeyboardShortcut() {
  robot.keyTap("e", ["control", "alt", "shift"]);
  setTimeout(() => robot.keyTap("f", ["control", "alt", "shift"]), 3000);
}

function messageHandler(message) {
  console.log("message is ", message)
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

const wrapper = new SocketServerWrapper(messageHandler)

function createFfmpegTrimCommand(tweet, in_file, out_file) {
  let trim = ""
  if (tweet.in_point && tweet.out_point) {
    trim = `${ffmpeg} -i ${in_file} -ss ${tweet.in_point} -to ${tweet.out_point} ${out_file}`
  } else if (tweet.in_point) {
    trim = `${ffmpeg} -i ${in_file} -ss ${tweet.in_point} ${out_file}`
  } else if (tweet.out_point) {
    trim = `${ffmpeg} -i ${in_file} -to ${tweet.out_point} ${out_file}`
  }
  return trim;
}

function createFfmpegStripAudioCommand(out_file, out_file_no_audio) {
  return `${ffmpeg} -i ${out_file} -c copy -an ${out_file_no_audio}`;
}

function saveWithNewName(in_file, out_file_no_audio, out_file, tweet) {
  let ffmpegTrimCommand = createFfmpegTrimCommand(tweet, in_file, out_file);
  if (ffmpegTrimCommand !== "") {
    executeFfmpegCommand(ffmpegTrimCommand)
  } else {
    fs.copyFileSync(in_file, out_file)
  }
  executeFfmpegCommand(createFfmpegStripAudioCommand(out_file, out_file_no_audio))
}

function executeFfmpegCommand(command: string) {
  execSync(command, (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  }
)
}

function slugifiedPath(tweet) {
  return `${tomlData.output_dir}/${slugify(tweet.text)}${path.extname(tweet.id)}`;
}

function noAudioPath(tweet) {
  return `${tomlData.output_noaudio_dir}/${slugify(tweet.text)}${path.extname(tweet.id)}`;
}

function saveForLater(tweet) {
  const newName = slugifiedPath(tweet);
  const newNameNoAudio = noAudioPath(tweet);
  saveWithNewName(tweet.id, newNameNoAudio, newName, tweet);
  deleteThumbnail(tweet.id)
}


function saveAndSendTweet(tweet) {
  const in_file = slugifiedPath(tweet);
  const out_file_no_audio = noAudioPath(tweet);
  saveWithNewName(tweet.id, out_file_no_audio, in_file, tweet);
  new VideoTweet({
    file_path: in_file,
    tweet_text: tweet.text
  });
  deleteThumbnail(tweet.id)
}

function deleteThumbnail(file_path: string) {
  fs.unlink(createThumbnailPath(file_path), function(e) {
    if (e) {
      console.log("error cleaning up file_path from preview directory (don't worry about it)")
    }
  })
}

function createThumbnailPath(file_path: string) {
  return `${tomlData.web_client_dir}/public/videos/${path.basename(file_path)}`;
}

watch(watchDirectory, { recursive: false, filter: (newDetectedFile: string) => {
    return !(fs.existsSync(newDetectedFile) && fs.lstatSync(newDetectedFile).isDirectory());
  } }, async (evt, newDetectedFile: string) => {
  if (evt === "update") {
    try {
      // this call fails if the file is being written to which is what we want as we don't want
      // to process incomplete files
      await getVideoDurationInSeconds(newDetectedFile)
    } catch (e) {
      console.log("incomplete file found, skipping", e)
    }
    let thumb = createThumbnailPath(newDetectedFile);
    fs.copyFileSync(newDetectedFile, thumb)
    wrapper.send(JSON.stringify({action: "tweetRequest", id: newDetectedFile, thumb: `/videos/${path.basename(thumb)}`}))
  }
});

