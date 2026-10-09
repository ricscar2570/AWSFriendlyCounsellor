import contextlib
import http.server
import json
import socket
import socketserver
import threading
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HOST = "127.0.0.1"

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

def free_port():
    with socket.socket() as s:
        s.bind((HOST, 0))
        return s.getsockname()[1]

@contextlib.contextmanager
def server():
    port = free_port()
    handler = lambda *a, **kw: QuietHandler(*a, directory=str(ROOT), **kw)
    httpd = socketserver.TCPServer((HOST, port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://{HOST}:{port}"
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=5)

def assert_true(value, message):
    if not value:
        raise AssertionError(message)

with server() as base, sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    page.on(
        "console",
        lambda msg: errors.append(f"console error: {msg.text}")
        if msg.type == "error" else None,
    )

    page.goto(f"{base}/index.html#/projects", wait_until="networkidle")
    page.locator("#create-tenant-form input[name=name]").fill("Browser Gate Team")
    page.locator("#create-tenant-form button[type=submit]").click()
    page.wait_for_function("() => location.hash === '#/dashboard'")
    page.locator("h1").filter(has_text="Good to see you").wait_for()
    assert_true("Standalone health" in page.locator("body").inner_text(), "dashboard rendered")

    page.goto(f"{base}/index.html#/projects", wait_until="networkidle")
    page.locator("[data-action=show-project-form]").click()
    page.locator("#project-create-form input[name=name]").fill("Browser Gate Project")
    page.locator("#project-create-form textarea[name=description]").fill(
        "A browser-gate SaaS workload with login, uploads, background jobs and analytics."
    )
    page.locator("#project-create-form button[type=submit]").click()
    page.wait_for_function("() => location.hash.startsWith('#/project/')")
    assert_true("Browser Gate Project" in page.locator("body").inner_text(), "project persisted")

    page.goto(f"{base}/index.html#/discovery", wait_until="networkidle")
    page.get_by_role("heading", name="AWS Discovery").wait_for()
    discovery_payload = {
        "format": "awsfc-aws-discovery",
        "format_version": 1,
        "collector_version": "browser-smoke",
        "generated_at": "2026-10-09T17:00:00Z",
        "account": {"id": "123456789012", "arn": "arn:aws:iam::123456789012:role/ReadOnly"},
        "regions": ["eu-central-1"],
        "resources": [
            {"service": "lambda", "type": "function", "id": "browser-smoke", "region": "eu-central-1"},
            {"service": "s3", "type": "bucket", "id": "browser-smoke-bucket", "region": "global"},
        ],
        "errors": [],
    }
    page.locator("#discovery-import-form input[type=file]").set_input_files({
        "name": "awsfc-discovery.json",
        "mimeType": "application/json",
        "buffer": json.dumps(discovery_payload).encode("utf-8"),
    })
    page.locator("#discovery-import-form button[type=submit]").click()
    page.get_by_text("123456789012", exact=True).wait_for()
    assert_true("2 services" in page.locator("body").inner_text(), "discovery inventory persisted")

    page.goto(f"{base}/index.html#/data", wait_until="networkidle")
    page.get_by_role("heading", name="Data, Backup & Recovery").wait_for()
    with page.expect_download() as download_info:
        page.locator("[data-action=backup-export]").click()
    download = download_info.value
    assert_true(download.suggested_filename.endswith(".json"), "backup download expected")

    # Persistence must survive a normal reload.
    page.goto(f"{base}/index.html#/dashboard", wait_until="networkidle")
    page.reload(wait_until="networkidle")
    page.locator("h1").filter(has_text="Good to see you").wait_for()

    # PWA resources must be installable/cacheable and support an offline shell reload.
    page.evaluate("() => navigator.serviceWorker.ready.then(() => true)")
    page.reload(wait_until="networkidle")
    assert_true(page.evaluate("() => !!navigator.serviceWorker.controller"), "service worker controller")
    context.set_offline(True)
    page.reload(wait_until="domcontentloaded")
    page.locator("h1").filter(has_text="Good to see you").wait_for()
    context.set_offline(False)

    # Ignore Chromium's favicon lookup if any; application errors are not allowed.
    errors = [e for e in errors if "favicon.ico" not in e]
    assert_true(not errors, "browser errors: " + " | ".join(errors))
    context.close()
    browser.close()

print("BROWSER SMOKE PASS")
