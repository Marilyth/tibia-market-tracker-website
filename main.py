from tibia import Client, MarketValues, Wiki
import time
import os
import typer


def write_marketable_items():
    items = Wiki().get_all_marketable_items()
    with open("tracked_items.txt", "w") as f:
        for item in items:
            f.write(item + "\n")

def do_market_search(email: str, password: str, tibia_location: str):
    client = Client()
    client.start_game(tibia_location)
    client.login_to_game(email, password)

    afk_time = time.time()
    client.open_market()
    
    with open("tracked_items.txt", "r") as t:
        with open("results/fullscan_tmp.txt", "w") as f:
            f.write("Name,SellPrice,BuyPrice,AvgSellPrice,AvgBuyPrice,Sold,Bought,Profit,RelProfit,PotProfit\n")
            for i, item in enumerate(t.readlines()):

                # Restart Tibia every 13 minutes to avoid afk kick.
                if time.time() - afk_time > 800:
                    client.exit_tibia()
                    time.sleep(2)
                    client.start_game(tibia_location)
                    client.login_to_game(email, password)
                    
                    afk_time = time.time()
                    client.open_market()

                values = client.search_item(item.replace("\n", ""))
                print(f"{i}. {values}")
                f.write(str(values) + "\n")

                with open(f"results/histories/{values.name}.txt", "a+") as h:
                    h.write(str(values) + f",{time.time()}" + "\n")
        
    client.exit_tibia()
    os.replace("results/fullscan_tmp.txt", "results/fullscan.txt")

if __name__ == "__main__":
    typer.run(do_market_search)
