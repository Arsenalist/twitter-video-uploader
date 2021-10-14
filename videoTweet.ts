const fs = require('fs');
const request = require('request');

const MEDIA_ENDPOINT_URL = 'https://upload.twitter.com/1.1/media/upload.json'
const POST_TWEET_URL = 'https://api.twitter.com/1.1/statuses/update.json'
const toml = require('toml');
const tomlData = toml.parse(fs.readFileSync('config.toml'));

const OAUTH = {
    consumer_key: tomlData.twitter.consumer_key,
    consumer_secret: tomlData.twitter.consumer_secret,
    token: tomlData.twitter.token,
    token_secret: tomlData.twitter.token_secret
}


export class VideoTweet {
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


    private check_status = (processing_info) => {

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
            } else if (processing_info.state == 'failed') {
                return;
            }

            // check status again after specified duration
            const timeout_length = data.processing_info.check_after_secs ? data.processing_info.check_after_secs * 1000 : 0;

            // console.log('Checking after ' + timeout_length + ' milliseconds');

            setTimeout(() => {
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
        request.post({url: POST_TWEET_URL, oauth: OAUTH, form: request_data}, function (error, response, body) {
            JSON.parse(body)
        });
    }
}
