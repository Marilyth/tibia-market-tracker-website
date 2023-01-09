from crypt import methods
from flask import Flask, request, send_from_directory, json, jsonify
from flask_cors import CORS, cross_origin
from threading import Thread, Lock

from numpy import append
from py import process
from datetime import datetime
import os
import json
import pandas

api = Flask(__name__)
cors = CORS(api)

results = None
last_full_scan = datetime.min
full_scan_lock = Lock()
item_locks = {}

@api.route("/get_items", methods=["GET"])
@cross_origin(origins="*", allow_headers="*", methods="*")
def get_items():
    name = request.args.get("name", "").lower()
    minTraded = request.args.get("minTraded", 0, int)
    maxTraded = request.args.get("maxTraded", 999999999, int)
    minSellPrice = request.args.get("minSellPrice", 0, int)
    maxSellPrice = request.args.get("maxSellPrice", 999999999, int)
    minBuyPrice = request.args.get("minBuyPrice", 0, int)
    maxBuyPrice = request.args.get("maxBuyPrice", 999999999, int)
    orderBy = request.args.get("orderBy", "Name", str)
    orderDirection = request.args.get("orderDirection", 1, int)

    items = load_items()
    if name:
        items = items[items["Name"].str.contains(name)]

    items = items.sort_values(orderBy, ascending=orderDirection == 1)
    values = []
    names = items.columns.values.tolist()
    for item in items.values.tolist():
        item_dict = {}
        for i, val in enumerate(item):
            item_dict[names[i]] = val

        if item_dict["Name"] == name:
            values.insert(0, item_dict)
        else:
            values.append(item_dict)

    return jsonify(values)

def load_items():
    global results, last_full_scan, is_reading_full_scan
    full_scan_lock.acquire()

    try:
        current_scan_time = datetime.fromtimestamp(os.path.getmtime("results/fullscan.txt"))
        if last_full_scan < current_scan_time:
            last_full_scan = current_scan_time
            results = pandas.read_csv("results/fullscan.txt")
    finally:
        full_scan_lock.release()
    
    return results

def run_api():
    api.run(host="0.0.0.0")

if __name__ == "__main__":
    print("Starting server...")
    Thread(target=run_api).start()