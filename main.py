from tibia import Client, MarketValues
import typer


def do_market_search(email: str, password: str):
    client = Client(email, password)
    item_values = []

    with open("tracked_items.txt", "w") as f:
        for item in f.readlines:
            values = client.search_item(item)
            item_values.append(values)
        

if __name__ == "__main__":
    typer.run(do_market_search)