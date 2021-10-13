var request = require('request');
const fs = require('fs');
const toml = require('toml');
const tomlData = toml.parse(fs.readFileSync('config.toml'));
const { getVideoDurationInSeconds } = require('get-video-duration')

var MEDIA_ENDPOINT_URL = 'https://upload.twitter.com/1.1/media/upload.json'
var POST_TWEET_URL = 'https://api.twitter.com/1.1/statuses/update.json'

var OAUTH = {
  consumer_key: tomlData.twitter.consumer_key,
  consumer_secret: tomlData.twitter.consumer_secret,
  token: tomlData.twitter.token,
  token_secret: tomlData.twitter.token_secret
}


/**
 * Video Tweet constructor
 **/
var VideoTweet = function (data) {

  var self = this;
  self.file_path = data.file_path;
  self.tweet_text = data.tweet_text;
  self.total_bytes = undefined;
  self.media_id = undefined;
  self.processing_info = undefined;

  // retreives file info and inits upload on complete
  fs.stat(self.file_path, function (error, stats) {
    self.total_bytes = stats.size
    self.upload_init();
  });
};


/**
 * Inits media upload
 */
VideoTweet.prototype.upload_init = function () {


  var self = this;

  form_data = {
    'command': 'INIT',
    'media_type': 'video/mp4',
    'total_bytes': self.total_bytes,
    'media_category': 'tweetvideo'
  }

  // inits media upload
  request.post({url: MEDIA_ENDPOINT_URL, oauth: OAUTH, formData: form_data}, function (error, response, body) {

    data = JSON.parse(body)
    // store media ID for later reference
    self.media_id = data.media_id_string;

    // start appening media segments
    self.upload_append();
  });
}


/**
 * Uploads/appends video file segments
 */
VideoTweet.prototype.upload_append = function () {

  var buffer_length = 5000000;
  var buffer = new Buffer(buffer_length);
  var bytes_sent = 0;

  var self = this;

  // open and read video file
  fs.open(self.file_path, 'r', function(error, file_data) {

    var bytes_read, data,
    segment_index = 0,
    segments_completed = 0;

    // upload video file in chunks
    while (bytes_sent < self.total_bytes) {


      bytes_read = fs.readSync(file_data, buffer, 0, buffer_length, null);
      data = bytes_read < buffer_length ? buffer.slice(0, bytes_read) : buffer;
      var form_data = {
          command: 'APPEND',
          media_id: self.media_id,
          segment_index: segment_index,
          media_data: data.toString('base64')
      };

      request.post({url: MEDIA_ENDPOINT_URL, oauth: OAUTH, formData: form_data}, function () {
        segments_completed = segments_completed + 1;

        if (segments_completed == segment_index) {
          self.upload_finalize();
        }
      });

      bytes_sent = bytes_sent + buffer_length;
      segment_index = segment_index + 1;
    }
  });

}


/**
 * Finalizes media segments uploaded
 */
VideoTweet.prototype.upload_finalize = function () {

  var self = this;

  form_data = {
    'command': 'FINALIZE',
    'media_id': self.media_id
  }

  // finalize uploaded chunck and check processing status on compelete
  request.post({url: MEDIA_ENDPOINT_URL, oauth: OAUTH, formData: form_data}, function(error, response, body) {

    data = JSON.parse(body)
    self.check_status(data.processing_info);
  });
}


/**
 * Checks status of uploaded media
 */
VideoTweet.prototype.check_status = function (processing_info) {

  var self = this;

  // if response does not contain any processing_info, then video is ready
  if (!processing_info) {
    self.tweet();
    return;
  }


  request_params = {
    'command': 'STATUS',
    'media_id': self.media_id
  }

  // check processing status
  request.get({url: MEDIA_ENDPOINT_URL, oauth: OAUTH, qs: request_params}, function(error, response, body) {

    data = JSON.parse(body)

    //console.log('Media processing status is ' + processing_info.state);

    if (processing_info.state == 'succeeded') {
      self.tweet();
      return
    }

    else if (processing_info.state == 'failed') {
      return;
    }

    // check status again after specified duration
    var timeout_length = data.processing_info.check_after_secs ? data.processing_info.check_after_secs * 1000 : 0;

    // console.log('Checking after ' + timeout_length + ' milliseconds');

    setTimeout(function () {
      self.check_status(data.processing_info)
    }, timeout_length);
  });
}


/**
 * Tweets text with attached media
 */
VideoTweet.prototype.tweet = function () {

  var self = this;

  request_data = {
    'status': self.tweet_text,
    'media_ids': self.media_id
  }

  // publish Tweet
  request.post({url: POST_TWEET_URL, oauth: OAUTH, form: request_data}, function(error, response, body) {

    data = JSON.parse(body)


  });
}

const path = require('path');
const watch = require('node-watch');
const slugify = require('slugify');

const { execSync  } = require("child_process");

const ffmpeg = tomlData.ffmpeg_binary;
const watchDirectory = tomlData.obs_watch_dir;

var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {
  console.log((new Date()) + ' Received request for ' + request.url);
  response.writeHead(404);
  response.end();
});
server.listen(8888, function() {
  console.log((new Date()) + ' Server is listening on port 8888');
});

wsServer = new WebSocketServer({
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
var connection

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
  var robot = require("robotjs");
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
    console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
  });
});

watch(watchDirectory, { recursive: false, filter: function(f, skip) {
    return !(fs.existsSync(f) && fs.lstatSync(f).isDirectory());
  } }, async function(evt, name) {
  console.log("in handler ", name)
  if (evt === "update") {
    try {
      // this call fails if the file is being written to which is what we want as we don't want
      // to process incomplete files
      console.log("getting duration")
      const duration = await getVideoDurationInSeconds(name)
      console.log("duration ", duration)
      let thumb = `${tomlData.web_client_dir}/public/videos/${path.basename(name)}`;
      console.log("thumb ", thumb)
      fs.copyFileSync(name, thumb)
      console.log("after sync")
      connection.sendUTF(JSON.stringify({action: "tweetRequest", id: name, thumb: `/videos/${path.basename(thumb)}`}));
      console.log("after send")
    } catch (e) {
      console.log("incomplete file found, skipping", e)
    }
  }
});

