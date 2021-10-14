const { execSync  } = require("child_process");

export class FfmpegCommandExecutor {
    executeFfmpegCommand = (command: string) => {
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
        })
    }
}
