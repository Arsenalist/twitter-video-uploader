export class FfmpegCommandFactory {
    private readonly ffmpegBinary: string

    constructor(ffmpegBinary: string) {
        this.ffmpegBinary = ffmpegBinary
    }

    creatTrimCommand = (in_point: number, out_point: number, in_file: string, out_file: string) => {
        let trim = ""
        if (in_point && out_point) {
            trim = `${this.ffmpegBinary} -i ${in_file} -ss ${in_point} -to ${out_point} ${out_file}`
        } else if (in_point) {
            trim = `${this.ffmpegBinary} -i ${in_file} -ss ${in_point} ${out_file}`
        } else if (out_point) {
            trim = `${this.ffmpegBinary} -i ${in_file} -to ${out_point} ${out_file}`
        }
        return trim;
    }

    createStripAudioCommand = (out_file: string, out_file_no_audio: string) => {
        return `${this.ffmpegBinary} -i ${out_file} -c copy -an ${out_file_no_audio}`;
    }
}
