var request = require('request');
var fs = require('fs');


var MEDIA_ENDPOINT_URL = 'https://upload.twitter.com/1.1/media/upload.json'
var POST_TWEET_URL = 'https://api.twitter.com/1.1/statuses/update.json'

var OAUTH = {
  consumer_key: '',
  consumer_secret: '',
  token: '',
  token_secret: ''
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
    console.log("done")
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
var path = require('path')
var fs = require('fs');
var watch = require('node-watch');
var prompt = require('prompt');
var slugify = require('slugify')
const watchDirectory = "C:\\Users\\zarar\\Videos\\OBS"
watch(watchDirectory, { recursive: false, filter: function(f, skip) {
    if (/tweets/.test(f)) return skip;
    return true
  } }, function(evt, name) {
  console.log(evt, name)
  if (evt === "update") {
    prompt.start();
    prompt.get(['tweet'], function (err, result) {
      if (result.tweet) {
        videoTweet = new VideoTweet({
          file_path: name,
          tweet_text: result.tweet
        });
        const newName = `${path.dirname(name)}/tweets/${slugify(result.tweet)}${path.extname(name)}`;
        fs.copyFile(name, newName, function(err) {
          if (err) {
            console.log("error copying file ", err)
          }
        })
      } else {
        console.log("ignoring...")
      }
    });
  }

});

/**
 * Instantiates a VideoTweet
 */
