import {FfmpegCommandFactory} from "./ffmpegCommandFactory";

describe('FfmpegCommandFactory', function () {

    let factory: FfmpegCommandFactory
    const ffmpegBinary = "ffmpeg"
    beforeEach(() => {
        factory = new FfmpegCommandFactory(ffmpegBinary)
    })

    describe('createStripAudioCommand', function () {
        it("executes ffmpeg command with -an option preceding out file", () => {
            expect(factory.createStripAudioCommand("infile", "outfile")).toEqual(`${ffmpegBinary} -i infile -c copy -an outfile`)
        })
    })

    describe('creatTrimCommand', function () {
        it("sets in and out correctly when both are provided", () => {
            expect(factory.creatTrimCommand(5, 7, "infile", "outfile")).toEqual(`${ffmpegBinary} -i infile -ss 5 -to 7 outfile`)
        })
        it("sets in only when out isn't provided", () => {
            expect(factory.creatTrimCommand(5, undefined, "infile", "outfile")).toEqual(`${ffmpegBinary} -i infile -ss 5 outfile`)
        })
        it("sets out only when in isn't provided", () => {
            expect(factory.creatTrimCommand(undefined, 7, "infile", "outfile")).toEqual(`${ffmpegBinary} -i infile -to 7 outfile`)
        })
        it("does not provide a command provided if neither in or out provided", () => {
            expect(factory.creatTrimCommand(undefined, undefined, "infile", "outfile")).toEqual("")
        })
        it("does not provide a command when out < in", () => {
            expect(factory.creatTrimCommand(5, 3, "infile", "outfile")).toEqual("")
        })
        it("does not provide a command when in and out are the same", () => {
            expect(factory.creatTrimCommand(3, 3, "infile", "outfile")).toEqual("")
        })
    })
});
