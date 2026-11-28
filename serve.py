#!/usr/bin/env python3
"""Static file server with HTTP Range, gzip, and cache headers for video scrubbing."""

from __future__ import annotations

import argparse
import gzip
import io
import mimetypes
import os
import re
import socketserver
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")

# Long-lived cache for immutable-ish static assets; short for HTML.
CACHE_LONG = "public, max-age=31536000, immutable"
CACHE_MED = "public, max-age=300, must-revalidate"
CACHE_HTML = "public, max-age=60, must-revalidate"

GZIP_TYPES = {
    "text/html",
    "text/css",
    "text/javascript",
    "application/javascript",
    "application/json",
    "image/svg+xml",
    "application/xml",
    "text/plain",
    "text/xml",
}


def cache_for(path: Path, content_type: str) -> str:
    ext = path.suffix.lower()
    if ext in {".html", ".htm"} or content_type.startswith("text/html"):
        return CACHE_HTML
    if ext in {".mp4", ".webm", ".webp", ".jpg", ".jpeg", ".png", ".svg", ".woff2", ".woff"}:
        return CACHE_LONG
    if ext in {".css", ".js", ".min.js", ".min.css"}:
        return CACHE_MED
    return CACHE_MED


class RangeHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:
        return

    def do_GET(self) -> None:
        self._serve(head_only=False)

    def do_HEAD(self) -> None:
        self._serve(head_only=True)

    def _wants_gzip(self, content_type: str) -> bool:
        accept = self.headers.get("Accept-Encoding", "")
        base = content_type.split(";")[0].strip().lower()
        return "gzip" in accept and base in GZIP_TYPES

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
        if path.suffix.lower() == ".webp":
            content_type = "image/webp"
        if path.suffix.lower() == ".js":
            content_type = "application/javascript"
        range_header = self.headers.get("Range")
        cache = cache_for(path, content_type)

        # Range requests (video scrub) — never gzip; keep byte offsets intact.
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
            self.send_header("Cache-Control", cache)
            self.send_header("Vary", "Accept-Encoding")
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

        raw = path.read_bytes()
        body = raw
        encoding = None
        if self._wants_gzip(content_type) and len(raw) > 512:
            buf = io.BytesIO()
            with gzip.GzipFile(fileobj=buf, mode="wb", compresslevel=6) as gz:
                gz.write(raw)
            compressed = buf.getvalue()
            if len(compressed) < len(raw):
                body = compressed
                encoding = "gzip"

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        self.send_header("Vary", "Accept-Encoding")
        if encoding:
            self.send_header("Content-Encoding", encoding)
        self.end_headers()
        if head_only:
            return
        self.wfile.write(body)


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=os.environ.get("HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "3847")))
    args = parser.parse_args()
    os.chdir(ROOT)
    mimetypes.add_type("image/webp", ".webp")
    mimetypes.add_type("video/mp4", ".mp4")
    with ReusableTCPServer((args.host, args.port), RangeHandler) as httpd:
        print(f"Serving {ROOT} on http://{args.host}:{args.port} (Range + gzip)", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
