from tibia import Client, MarketValues, Wiki
import time
import os
import json
import schedule
import subprocess
from git.repo import Repo


def write_marketable_items():
    items = Wiki().get_all_marketable_items()
    with open("tracked_items.txt", "w") as f:
        for item in items:
            f.write(item + "\n")

def do_market_search(email: str, password: str, tibia_location: str, results_location: str):
    client = Client()
    client.start_game(tibia_location)
    client.login_to_game(email, password)

    afk_time = time.time()
    client.open_market()

    fullscan_mode = "w"
    scanned_items = 0
    if os.path.exists(os.path.join(results_location, "fullscan_tmp.csv")):
        with open(os.path.join(results_location, "fullscan_tmp.csv"), "r") as f:
            print("Previous run aborted, continuing where stopped.")
            scanned_items = len(f.readlines()) - 2 # Don't count header, don't count empty line at end.
            fullscan_mode = "a+"

    with open("tracked_items.txt", "r") as t:
        with open(os.path.join(results_location, "fullscan_tmp.csv"), fullscan_mode) as f:
            if scanned_items == 0:
                f.write("Name,SellPrice,BuyPrice,AvgSellPrice,AvgBuyPrice,Sold,Bought,Profit,RelProfit,PotProfit\n")
                
            for i, item in enumerate(t.readlines()):
                if i + 1 < scanned_items or not item:
                    continue

                # Restart Tibia every 13 minutes to avoid afk kick.
                if time.time() - afk_time > 800:
                    client.close_market()
                    client.wiggle()
                    afk_time = time.time()
                    client.open_market(False)

                values = client.search_item(item.replace("\n", ""))
                print(f"{i}. {values}")
                f.write(str(values) + "\n")

                with open(os.path.join(results_location, "histories", f"{values.name.lower()}.csv"), "a+") as h:
                    h.write(str(values) + f",{time.time()}" + "\n")
        
    client.exit_tibia()

    os.replace(os.path.join(results_location, "fullscan_tmp.csv"), os.path.join(results_location, "fullscan.csv"))
    push_to_github(results_location)

    turn_off_display()

def push_to_github(results_repo_location: str):
    """
    Pushes the new market data from the results repo to GitHub.
    """
    try:
        repo = Repo(os.path.join(results_repo_location, ".git"))
        repo.git.add(all=True)
        repo.index.commit("Update market data")
        origin = repo.remote("origin")
        origin.push()
    except Exception as e:
        print(f"Error while pushing to git: {e}")

def turn_off_display():
    """
    Turns display off to save power. It will turn on again on pyautogui movement.
    """
    subprocess.Popen(["xset", "-display", ":0.0", "dpms", "force", "off"])

if __name__ == "__main__":
    config = None
    with open("config.json", "r") as c:
        config = json.loads(c.read())

    turn_off_display()

    #do_market_search(config["email"], config["password"], config["tibiaLocation"], config["resultsLocation"])
    schedule.every().day.at("18:00:00").do(lambda: do_market_search(config["email"], config["password"], config["tibiaLocation"], config["resultsLocation"]))
    schedule.every().day.at("06:00:00").do(lambda: do_market_search(config["email"], config["password"], config["tibiaLocation"], config["resultsLocation"]))
    
    while True:
        schedule.run_pending()
        time.sleep(60)
