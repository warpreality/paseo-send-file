Send file gives every agent a `send_file_to_user` tool. When you ask an agent to give you a file, it calls the tool with a path on the daemon machine and a card with a download button appears in the chat. Pressing the button saves the file on the computer running the Paseo app, which is useful when the daemon runs on a remote server.

The file is read from the daemon in 4 MB chunks over the existing Paseo connection, so no extra ports or URLs are exposed. In the desktop and web app a "Save as" dialog opens when available; otherwise the file goes to the regular downloads folder. On mobile the card shows the file and lets you copy its path.

Only files an agent explicitly shared can be downloaded. Links stay valid for 7 days and survive plugin reloads, but the chat card itself disappears after a daemon restart. The default size limit is 2 GB; set `PASEO_SEND_FILE_MAX_BYTES` in the daemon environment to change it. Directories are not supported; the agent is told to archive them first.
