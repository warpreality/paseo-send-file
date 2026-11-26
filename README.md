# paseo-send-file

A [Paseo](https://paseo.sh) plugin that lets agents send files from the daemon machine to the chat. Images are shown inline; other files get a download button.

Useful when the Paseo daemon runs on a remote server and you want a file (a log, a dump, a report, an archive) on the computer where the Paseo app is running.

## How it works

- Every agent gets a `send_file_to_user` tool: `path` (absolute, `~/…` or relative to the agent's cwd), optional `filename` and `note`.
- The tool registers the file under a random token and appends a card to the agent's timeline with the file name, size, path and a **Download** button.
- Images (PNG, JPEG, GIF, WebP, BMP, SVG on web/desktop) up to 25 MB are rendered inline in the chat; tap to open full size. The server reads the pixel size from the file header (honouring JPEG EXIF rotation) so the card reserves space and the timeline does not jump while the image loads.
- The button streams the file from the daemon in 4 MB chunks over the existing Paseo connection — no extra ports or public URLs.
- Desktop/web app: uses the native "Save as" dialog when available (streams to disk), otherwise a regular browser download.
- Mobile: images are shown inline; other files show a "copy path" button.

Only files an agent explicitly shared are readable through the plugin's RPC.

## Install

```bash
paseo plugin install github:warpreality/paseo-send-file
```

Or from a local checkout:

```bash
git clone https://github.com/warpreality/paseo-send-file.git
cd paseo-send-file && npm install && npm run typecheck
paseo plugin install "$PWD"
```

Plugins must be enabled on the daemon (`pluginsEnabled: true`, or Settings → Plugins). Already open agent sessions pick up the tool before their next prompt.

## Usage

Just ask the agent: *"send me /var/log/app.log"*, *"pack the reports directory and send it to me"* or *"take a screenshot and show it to me"*.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PASEO_SEND_FILE_MAX_BYTES` | `2147483648` (2 GB) | Max file size the tool accepts. Set in the daemon environment. |

Share tokens are stored in `$PASEO_HOME/plugin-data/paseo-send-file/shares.json` and expire after 7 days.

## Limitations

- Directories are not supported — the agent is instructed to archive them first.
- Timeline cards live in the daemon's memory and disappear after a daemon restart (Paseo limitation); links survive plugin reloads.
- Without the "Save as" picker, the browser fallback assembles the whole file in memory — prefer the picker for very large files.

## Requirements

Paseo `>= 0.16.2`.

## License

MIT
