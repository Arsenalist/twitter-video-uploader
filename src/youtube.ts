var fs = require('fs');
var readline = require('readline');
var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;

export const uploadToYouTube = async (credentials, fileName, text) => {

    var oauth2Client = new OAuth2(credentials.clientId, credentials.clientSecret, "https://localhost");
    oauth2Client.credentials = {
        "access_token": credentials.access_token,
        "refresh_token": credentials.refresh_token,
        "scope": "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
        "token_type": "Bearer",
        "expiry_date": Math.floor(new Date().getTime() / 1000) + 7890000
    }

    const youtube = google.youtube('v3')
    const fileSize = fs.statSync(fileName).size;
    const res = await youtube.videos.insert(
        {
            auth: oauth2Client,
            part: 'id,snippet,status',
            notifySubscribers: false,
            requestBody: {
                snippet: {
                    title: text,
                    description: text,
                },
                status: {
                    privacyStatus: 'private',
                },
            },
            media: {
                body: fs.createReadStream(fileName),
            },
        },
        {
            // Use the `onUploadProgress` event from Axios to track the
            // number of bytes uploaded to this point.
            onUploadProgress: evt => {
                const progress = (evt.bytesRead / fileSize) * 100;
                readline.clearLine(process.stdout, 0);
                readline.cursorTo(process.stdout, 0, null);
                process.stdout.write(`${Math.round(progress)}% complete`);
            },
        }
    );
}

