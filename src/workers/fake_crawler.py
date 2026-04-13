# Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
# Proprietary and confidential. Unauthorized use is strictly prohibited.
# See LICENSE file in the project root for full license information.

# this is just a mimic and fake crawler worker that simulates a crawl session for testing purposes. It does not perform any real crawling.
import argparse
import sys
import threading
import time

# Control state
state = {"paused": False, "running": True}

def command_listener():
    for line in sys.stdin:
        cmd = line.strip()
        if cmd == "ABORT":
            state["running"] = False
            break
        elif cmd == "PAUSE":
            state["paused"] = True
        elif cmd == "RESUME":
            state["paused"] = False

# Start background listener
threading.Thread(target=command_listener, daemon=True).start()

def run_crawler():
    while state["running"]:
        if state["paused"]:
            time.sleep(1) # Wait and check again
            continue
        print(f"Crawling... {i+1}/30")
        time.sleep(1)

if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='Fake Crawler Worker')
    parser.add_argument('--session', type=str, required=True, help='Crawl session ID')
    args = parser.parse_args()
    session_id = args.session
    print(f"Starting fake crawl session: {session_id}")
    run_crawler()
    print(f"Finished fake crawl session: {session_id}")