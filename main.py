from tibia import Client, MarketValues
import time
import os
import typer

def do_market_search(email: str, password: str, tibia_location: str):
    client = Client()
    client.start_game(tibia_location)
    client.login_to_game(email, password)
    client.open_market()

    item_values = []

    with open("tracked_items.txt", "r") as f:
        for i, item in enumerate(f.readlines()):
            values = client.search_item(item.replace("\n", ""))
            print(f"{i}. {values}")
            item_values.append(values)
        
    client.exit_tibia()

    with open("results/fullscan_tmp.txt", "w") as f:
        f.write("Name,SellPrice,BuyPrice,AvgSellPrice,AvgBuyPrice,Sold,Bought,Profit,RelProfit,PotProfit\n")
        for item in item_values:
            f.write(str(item) + "\n")
            with open(f"results/histories/{item.name}.txt", "a+") as h:
                h.write(str(item) + f",{time.time()}" + "\n")
    
    os.replace("results/fullscan_tmp.txt", "results/fullscan.txt")

if __name__ == "__main__":
    typer.run(do_market_search)
