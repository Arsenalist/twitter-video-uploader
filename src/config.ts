const fs = require('fs');
const toml = require('toml');
interface AppConfig {
    obs_watch_dir: string
    output_dir: string
    output_noaudio_dir: string
    ffmpeg_binary: string
    web_client_dir: string
    twitter: TwitterConfig
    youtube: YouTubeConfig
}

export interface TwitterConfig {
    consumer_key: string
    consumer_secret: string
    token: string
    token_secret: string

}

export interface YouTubeConfig {
    clientSecret: string
    clientId: string
    access_token: string
    refresh_token: string
}

export const appConfig: AppConfig = toml.parse(fs.readFileSync('config.toml'));
