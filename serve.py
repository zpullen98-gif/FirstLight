"""Dev server for First Light.

Same as `python -m http.server` but sends Cache-Control: no-cache so the browser
always revalidates — edited files show up on plain reload instead of hiding behind
the heuristic HTTP cache. (In production the service worker owns caching; this
server is for development only.)

Usage: py serve.py [port]
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        # The default logs every asset on every reload, which buries anything useful.
        if "404" in (fmt % args):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8633
    root = Path(__file__).parent
    os.chdir(root)
    print("First Light — http://127.0.0.1:%d/  (Ctrl-C to stop)" % port)
    print("  ?nosw  skips service-worker registration while debugging the cache")
    ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
