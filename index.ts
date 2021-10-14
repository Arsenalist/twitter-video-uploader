const request = require('request');
const fs = require('fs');
const toml = require('toml');
const tomlData = toml.parse(fs.readFileSync('config.toml'));
const { getVideoDurationInSeconds } = require('get-video-duration')

const MEDIA_ENDPOINT_URL = 'https://upload.twitter.com/1.1/media/upload.json'
const POST_TWEET_URL = 'https://api.twitter.com/1.1/statuses/update.json'

const OAUTH = {
  consumer_key: tomlData.twitter.consumer_key,
  consumer_secret: tomlData.twitter.consumer_secret,
  token: tomlData.twitter.token,
  token_secret: tomlData.twitter.token_secret
}


/**
 * Video Tweet constructor
 **/
class VideoTweet {
  private readonly file_path: string;
  private readonly tweet_text: any;
  private total_bytes;
  private media_id: undefined;
  private processing_info: undefined;

  constructor(data) {
    this.file_path = data.file_path;
    this.tweet_text = data.tweet_text;

    // retrieves file info and inits upload on complete
    fs.stat(this.file_path, (error, stats) => {
      this.total_bytes = stats.size
      this.upload_init();
    });
  }

  private upload_init = () => {

    const form_data = {
      'command': 'INIT',
      'media_type': 'video/mp4',
      'total_bytes': this.total_bytes,
      'media_category': 'tweetvideo'
    }

    // inits media upload
    request.post({url: MEDIA_ENDPOINT_URL, oauth: OAUTH, formData: form_data}, (error, response, body) => {

      const data = JSON.parse(body)
      // store media ID for later reference
      this.media_id = data.media_id_string;

      // start appending media segments
      this.upload_append();
    });
  }

  private upload_append = () => {

    const buffer_length = 5000000;
    const buffer = new Buffer(buffer_length);
    let bytes_sent = 0;

    // open and read video file
    fs.open(this.file_path, 'r', (error, file_data) => {

      let bytes_read, data,
          segment_index = 0,
          segments_completed = 0;

      // upload video file in chunks
      while (bytes_sent < this.total_bytes) {


        bytes_read = fs.readSync(file_data, buffer, 0, buffer_length, null);
        data = bytes_read < buffer_length ? buffer.slice(0, bytes_read) : buffer;
        const form_data = {
          command: 'APPEND',
          media_id: this.media_id,
          segment_index: segment_index,
          media_data: data.toString('base64')
        };

        request.post({url: MEDIA_ENDPOINT_URL, oauth: OAUTH, formData: form_data}, () => {
          segments_completed = segments_completed + 1;

          if (segments_completed == segment_index) {
            this.upload_finalize();
          }
        });

        bytes_sent = bytes_sent + buffer_length;
        segment_index = segment_index + 1;
      }
    });
  }

  private upload_finalize = () => {

    const form_data = {
      'command': 'FINALIZE',
      'media_id': this.media_id
    }

    // finalize uploaded chunck and check processing status on compelete
    request.post({url: MEDIA_ENDPOINT_URL, oauth: OAUTH, formData: form_data}, (error, response, body) => {

      const data = JSON.parse(body)
      this.check_status(data.processing_info);
    });
  }


  private check_status =  (processing_info) => {

    // if response does not contain any processing_info, then video is ready
    if (!processing_info) {
      this.tweet();
      return;
    }


    const request_params = {
      'command': 'STATUS',
      'media_id': this.media_id
    }

    // check processing status
    request.get({url: MEDIA_ENDPOINT_URL, oauth: OAUTH, qs: request_params}, (error, response, body) => {

      const data = JSON.parse(body)

      //console.log('Media processing status is ' + processing_info.state);

      if (processing_info.state == 'succeeded') {
        this.tweet();
        return
      }

      else if (processing_info.state == 'failed') {
        return;
      }

      // check status again after specified duration
      const timeout_length = data.processing_info.check_after_secs ? data.processing_info.check_after_secs * 1000 : 0;

      // console.log('Checking after ' + timeout_length + ' milliseconds');

      setTimeout( () => {
        this.check_status(data.processing_info)
      }, timeout_length);
    });
  }

  private tweet = () => {
    const request_data = {
      'status': this.tweet_text,
      'media_ids': this.media_id
    }
    // publish Tweet
    request.post({url: POST_TWEET_URL, oauth: OAUTH, form: request_data}, function(error, response, body) {
      JSON.parse(body)
    });
  }
}


const path = require('path');
const watch = require('node-watch');
const slugify = require('slugify');

const { execSync  } = require("child_process");

const ffmpeg = tomlData.ffmpeg_binary;
const watchDirectory = tomlData.obs_watch_dir;

const WebSocketServer = require('websocket').server;
const http = require('http');

const server = http.createServer(function(request, response) {
  console.log((new Date()) + ' Received request for ' + request.url);
  response.writeHead(404);
  response.end();
});
server.listen(8888, function() {
  console.log((new Date()) + ' Server is listening on port 8888');
});

const wsServer = new WebSocketServer({
  httpServer: server,
  // You should not use autoAcceptConnections for production
  // applications, as it defeats all standard cross-origin protection
  // facilities built into the protocol and the browser.  You should
  // *always* verify the connection's origin and decide whether or not
  // to accept it.
  autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}
let connection

function ffmpegErrorHandler(error, stdout, stderr) {
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

function saveWithNewName(name, newNameNoAudio, newName, tweet) {
  let trim = ""
  if (tweet.in_point && tweet.out_point) {
    trim = `${ffmpeg} -i ${name} -ss ${tweet.in_point} -to ${tweet.out_point} ${newName}`
  } else if (tweet.in_point) {
    trim = `${ffmpeg} -i ${name} -ss ${tweet.in_point} ${newName}`
  } else if (tweet.out_point) {
    trim = `${ffmpeg} -i ${name} -to ${tweet.out_point} ${newName}`
  }
  if (trim !== "") {
    execSync(trim, ffmpegErrorHandler);
  } else {
    fs.copyFile(name, newName, function (err) {
      if (err) {
        console.log("error copying file ", err)
      }
    })
  }
  execSync(`${ffmpeg} -i ${newName} -c copy -an ${newNameNoAudio}`, ffmpegErrorHandler);
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


function processTweet(tweet) {
  const newName = slugifiedPath(tweet);
  const newNameNoAudio = noAudioPath(tweet);
  saveWithNewName(tweet.id, newNameNoAudio, newName, tweet);
  new VideoTweet({
    file_path: newName,
    tweet_text: tweet.text
  });
  deleteThumbnail(tweet.id)
}

function deleteThumbnail(file) {
  fs.unlink(`${tomlData.web_client_dir}/public/videos/${path.basename(file)}`, function(e) {
    if (e) {
      console.log("error cleaning up file from preview directory (don't worry about it)")
    }
  })
}

wsServer.on('request', function(request) {
  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject();
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
    return;
  }
  connection = request.accept('echo-protocol', request.origin);
  console.log((new Date()) + ' Connection accepted.');
  const robot = require("robotjs");
  connection.on('message', function(message) {
    console.log("message is ", message)
    const data = JSON.parse(message.utf8Data)
    if (message.type === 'utf8') {
      if (data.action === "saveReplay") {
        robot.keyTap("s", ["control", "shift"]);
      } else if (data.action === "saveVideo") {
        robot.keyTap("e", ["control", "alt", "shift"]);
        setTimeout(() => robot.keyTap("f", ["control", "alt", "shift"]), 3000);
      } else if (data.action === "saveAndSendTweet") {
        processTweet(data);
      } else if (data.action === "saveVideoWithNameOnly") {
        saveForLater(data);
      } else if (data.action === "clearVideo") {
        deleteThumbnail(data.id)
      }
    }
  });
  connection.on('close', function(reasonCode, description) {
    console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.', reasonCode, description);
  });
});

watch(watchDirectory, { recursive: false, filter: function(f, skip) {
    return !(fs.existsSync(f) && fs.lstatSync(f).isDirectory());
  } }, async function(evt, name) {
  if (evt === "update") {
    try {
      // this call fails if the file is being written to which is what we want as we don't want
      // to process incomplete files
      await getVideoDurationInSeconds(name)
    } catch (e) {
      console.log("incomplete file found, skipping", e)
    }
    let thumb = `${tomlData.web_client_dir}/public/videos/${path.basename(name)}`;
    fs.copyFileSync(name, thumb)
    connection.sendUTF(JSON.stringify({action: "tweetRequest", id: name, thumb: `/videos/${path.basename(thumb)}`}));
  }
});

