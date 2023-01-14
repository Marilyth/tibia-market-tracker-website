import pyautogui
import subprocess
import time
from typing import *
import screenshot
import requests


class MarketValues:
    def __init__(self, name: str, time: float, sell_offer: int, buy_offer: int, month_sell_offer: int, month_buy_offer: int, sold: int, bought: int, highest_sell: int, lowest_buy: int):
        self.buy_offer: int = max(buy_offer, lowest_buy)
        self.sell_offer: int = max(min(sell_offer, highest_sell), self.buy_offer) if sold > 0 else sell_offer
        self.month_sell_offer: int = month_sell_offer
        self.month_buy_offer: int = month_buy_offer
        self.sold: int = sold
        self.bought: int = bought
        self.profit: int = self.sell_offer - self.buy_offer
        self.rel_profit: float = round(self.profit / self.buy_offer, 2) if self.buy_offer > 0 else 0
        self.potential_profit: int = self.profit * min(sold, bought)
        self.name = name

    def __str__(self) -> str:
        return f"{self.name.lower()},{self.sell_offer},{self.buy_offer},{self.month_sell_offer},{self.month_buy_offer},{self.sold},{self.bought},{self.profit},{self.rel_profit},{self.potential_profit}"


class Wiki:
    def __init__(self):
        pass

    def get_all_marketable_items(self) -> List[str]:
        """
        Fetches all marketable item names from the tibia fandom wiki.
        """
        items = []
        url = "https://tibia.fandom.com/api.php?action=query&list=categorymembers&cmtitle=Category%3AMarketable+Items&format=json&cmprop=title&cmlimit=500"
        cmcontinue = ""
        while True:
            response = requests.get(url + (f"&{cmcontinue=}" if cmcontinue else "")).json()
            items.extend([member["title"] for member in response["query"]["categorymembers"]])

            if "continue" in response:
                cmcontinue = response["continue"]["cmcontinue"]
            else:
                break

        return items

class Client:
    def __init__(self):
        '''
        Starts Tibia, updates it if necessary.
        '''
        # Start Tibia.
        self.tibia: subprocess.Popen = None
        self.position_cache = {}
        self.market_tab = "offers"

    def start_game(self, location:str):
        self.tibia: subprocess.Popen = subprocess.Popen([location])
        time.sleep(5)

        self._update_tibia()

    def _update_tibia(self):
        """
        Checks if the update button exists, and if so, updates and starts Tibia.
        """
        self._wait_until_find("images/Update.png", click=True, timeout=10, cache=False)

        # Wait until update is done, and click play button.
        self._wait_until_find("images/PlayButton.png", click=True, cache=False)
        time.sleep(5)

    def login_to_game(self, email: str, password: str):
        """
        Logs into the provided account, and selects the provided character.
        """
        password_position = self._wait_until_find("images/PasswordField.png", click=True, cache=False)

        pyautogui.leftClick(password_position)
        pyautogui.typewrite(password)

        print("Finding email field")
        email_position = pyautogui.locateCenterOnScreen("images/EmailField.png")
        if email_position:
            pyautogui.leftClick(email_position)
            pyautogui.typewrite(email)
        else:
            print("Couldn't find Email field...")

        pyautogui.press("enter")

        # Go ingame.
        character_position = self._wait_until_find("images/BotCharacter.png", cache=False)
        pyautogui.doubleClick(character_position)
        
        # Wait until ingame.
        self._wait_until_find("images/Ingame.png", cache=False)
        print("Ingame.")

    def exit_tibia(self):
        """
        Closes Tibia unsafely. Probably better to log out before.
        """
        pyautogui.hotkey("alt", "f4")
        self._wait_until_find("images/Exit.png", click=True, cache=False)

    def open_market(self, open_depot=True):
        """
        Searches for an empty depot, and opens the market on it.
        """
        def try_open_market() -> bool:
            x, y = self._wait_until_find("images/SuccessDepotTile.png", timeout=5, cache=False)
            if x >= 0:
                if open_depot:
                    pyautogui.leftClick(636, 375)

                self._wait_until_find("images/Market.png", click=True, cache=False)
                self._wait_until_find("images/Details.png", cache=False)

                print("Market open.")
                return True
            
            return False

        if pyautogui.locateCenterOnScreen("images/SuccessDepotTile.png") and try_open_market():
            return

        open_depot = True
        for i in range(len(list(pyautogui.locateAllOnScreen("images/DepotTile.png")))):
            print(f"Trying depot {i}...")
            depot_position = list(pyautogui.locateAllOnScreen("images/DepotTile.png"))[i]
            pyautogui.leftClick(depot_position)
            if try_open_market():
                return

        print("Opening market failed!")
        exit(1)

    def search_item(self, name: str) -> MarketValues:
        """
        Searches for the specified item in the market, and returns its current highest feasible buy and sell offers, and values for the month.
        """
        try:
            pyautogui.hotkey("ctrl", "z")
            pyautogui.typewrite(name)
            pyautogui.press("down")
            time.sleep(0.2)

            def scan_details():
                if "images/Statistics.png" not in self.position_cache:
                    self.position_cache["images/Statistics.png"] = pyautogui.locateOnScreen("images/Statistics.png")

                statistics = self.position_cache["images/Statistics.png"]
                interpreted_statistics = screenshot.read_image_text(screenshot.process_image(screenshot.take_screenshot(statistics.left, statistics.top, 300, 140)))\
                    .replace(",", "").replace(".", "").replace(" ", "").replace("k", "000").splitlines()
                interpreted_statistics = [stat for stat in interpreted_statistics if len(stat) > 0]

                return interpreted_statistics

            def scan_offers():
                if "images/Offers.png" not in self.position_cache:
                    self.position_cache["images/Offers.png"] = list(pyautogui.locateAllOnScreen("images/Offers.png"))
                offers = self.position_cache["images/Offers.png"]
                sell_offers = offers[0]
                buy_offers = offers[1]

                interpreted_buy_offer = screenshot.read_image_text(screenshot.process_image(screenshot.take_screenshot(buy_offers.left, buy_offers.top + buy_offers.height + 3, buy_offers.width, buy_offers.height + 3)))\
                    .replace(",", "").replace(".", "").replace(" ", "").replace("k", "000").split("\n")[0]
                interpreted_sell_offer = screenshot.read_image_text(screenshot.process_image(screenshot.take_screenshot(sell_offers.left, sell_offers.top + sell_offers.height + 3, sell_offers.width, sell_offers.height + 3)))\
                    .replace(",", "").replace(".", "").replace(" ", "").replace("k", "000").split("\n")[0]

                sell_offer = int(interpreted_sell_offer) if interpreted_sell_offer.isnumeric() else -1
                buy_offer = int(interpreted_buy_offer) if interpreted_buy_offer.isnumeric() else -1

                return buy_offer, sell_offer

            if self.market_tab == "offers":
                buy_offer, sell_offer = scan_offers()
                self._wait_until_find("images/Details.png", click=True)
                interpreted_statistics = scan_details()
                self.market_tab = "details"
            else:
                interpreted_statistics = scan_details()
                self._wait_until_find("images/OffersButton.png", click=True)
                buy_offer, sell_offer = scan_offers()
                self.market_tab = "offers"

            values = MarketValues(name, time.time(), sell_offer, buy_offer, int(interpreted_statistics[6]), int(interpreted_statistics[2]), int(interpreted_statistics[4]), int(interpreted_statistics[0]), int(interpreted_statistics[5]), int(interpreted_statistics[3]))
            return values
        except pyautogui.FailSafeException as e:
            exit(1)
        except Exception as e:
            print(f"Market search failed for {name}: {e}")
            return MarketValues(name, time.time(), -1, -1, -1, -1, -1, -1, -1, -1)

    def close_market(self):
        """
        Closes the market window using the escape hotkey.
        """
        pyautogui.press("escape")
        time.sleep(0.1)
        pyautogui.press("escape")
        time.sleep(0.1)

    def wiggle(self):
        """
        Wiggles the character to avoid being afk kicked.
        """
        pyautogui.hotkey("ctrl", "right")
        time.sleep(0.5)
        pyautogui.hotkey("ctrl", "left")
        time.sleep(0.5)
        self.market_tab = "offers"

    def _wait_until_find(self, image: str, timeout: int = 1000, click: bool = False, cache: bool = True) -> Tuple[int, int]:
        start_time = time.time()

        while time.time() - start_time < timeout:
            if cache and image in self.position_cache:
                position = self.position_cache[image]
            else:
                print(f"Looking for {image}...")
                pyautogui.moveTo(20, 20)
                position = pyautogui.locateCenterOnScreen(image)
                if position:
                    self.position_cache[image] = position

            if position:
                if click:
                    pyautogui.leftClick(position)
                    
                return position

            time.sleep(0.2)
        
        return (-1, -1)
