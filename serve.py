#!/usr/bin/env python3
"""Static file server with HTTP Range support for video scrubbing."""

from __future__ import annotations

import argparse
import mimetypes
import os
import re
import socketserver
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")


class RangeHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:
        # Keep stdout quiet in the tmux session.
        return

    def do_GET(self) -> None:
        self._serve(head_only=False)

    def do_HEAD(self) -> None:
        self._serve(head_only=True)

    def _serve(self, head_only: bool) -> None:
        parsed = urlparse(self.path)
        rel = unquote(parsed.path)
        if rel.endswith("/"):
            rel += "index.html"
        rel = rel.lstrip("/")
        path = (ROOT / rel).resolve()

        if not str(path).startswith(str(ROOT)) or not path.is_file():
            self.send_error(404, "Not found")
            return

        file_size = path.stat().st_size
        content_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        range_header = self.headers.get("Range")

        if range_header:
            match = RANGE_RE.fullmatch(range_header.strip())
            if not match:
                self.send_error(416, "Invalid range")
                return
            start_s, end_s = match.groups()
            start = int(start_s) if start_s else 0
            end = int(end_s) if end_s else file_size - 1
            if start >= file_size or end >= file_size or start > end:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{file_size}")
                self.end_headers()
                return

            length = end - start + 1
            self.send_response(206)
            self.send_header("Content-Type", content_type)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            self.send_header("Content-Length", str(length))
            self.send_header("Cache-Control", "public, max-age=3600")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if head_only:
                return
            with path.open("rb") as handle:
                handle.seek(start)
                remaining = length
                while remaining:
                    chunk = handle.read(min(64 * 1024, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
            return

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(file_size))
        self.send_header("Cache-Control", "public, max-age=3600")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        if head_only:
            return
        with path.open("rb") as handle:
            while True:
                chunk = handle.read(64 * 1024)
                if not chunk:
                    break
                self.wfile.write(chunk)


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3847)
    args = parser.parse_args()
    os.chdir(ROOT)
    with ReusableTCPServer((args.host, args.port), RangeHandler) as httpd:
        print(f"Serving {ROOT} on http://{args.host}:{args.port} (Range enabled)", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
