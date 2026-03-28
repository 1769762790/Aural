declare module "fluent-ffmpeg" {
  type FfmpegHandler = (error?: Error, stdout?: string, stderr?: string) => void;

  interface FfmpegCommand {
    noVideo(): this;
    audioFilters(filters: string | string[]): this;
    format(format: string): this;
    output(target: string): this;
    on(event: "start", listener: (commandLine: string) => void): this;
    on(event: "stderr", listener: (line: string) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: FfmpegHandler): this;
    run(): this;
  }

  interface FfmpegStatic {
    (input?: string): FfmpegCommand;
    setFfmpegPath(path: string): void;
  }

  const ffmpeg: FfmpegStatic;
  export default ffmpeg;
}
