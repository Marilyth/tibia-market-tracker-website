from tibia import Client, MarketValues
import typer
import pytesseract
from PIL import Image
import screenshot


def do_market_search(email: str, password: str, tibia_location: str):
    client = Client()
    client.start_game(tibia_location)
    client.login_to_game(email, password)
    client.open_market()

    item_values = []

    with open("tracked_items.txt", "r") as f:
        for item in f.readlines():
            values = client.search_item(item)
            print(values)
            item_values.append(values)
        
    client.exit_tibia()

if __name__ == "__main__":
    typer.run(do_market_search)
