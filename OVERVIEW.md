Send file gives every agent a `send_file_to_user` tool. When you ask an agent to show or give you a file, it calls the tool with a path on the daemon machine and the file appears in the chat. This is useful when the daemon runs on a remote server.

Images (PNG, JPEG, GIF, WebP, BMP and, in the desktop and web app, SVG) up to 25 MB are shown right in the chat. Tap an image to open it full size. The agent is told to use this for screenshots, charts and plots instead of describing them. Other files, and bigger images, get a card with a download button.

Files are read from the daemon in 4 MB chunks over the existing Paseo connection, so no extra ports or URLs are exposed. In the desktop and web app the download button opens a "Save as" dialog when available; otherwise the file goes to the regular downloads folder. On mobile images are still shown inline, and other files show their path with a copy button.

Only files an agent explicitly shared can be read. Links stay valid for 7 days and survive plugin reloads, but the chat card itself disappears after a daemon restart. The default size limit is 2 GB; set `PASEO_SEND_FILE_MAX_BYTES` in the daemon environment to change it. Directories are not supported; the agent is told to archive them first.
