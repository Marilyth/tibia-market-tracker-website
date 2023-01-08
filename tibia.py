import pyautogui
import subprocess
import time
from typing import *
import screenshot


class MarketValues:
    def __init__(self, name: str, time: float, sell_offer: int, buy_offer: int, month_sell_offer: int, month_buy_offer: int, sold: int, bought: int):
        self.sell_offer: int = sell_offer
        self.buy_offer: int = buy_offer
        self.month_sell_offer: int = month_sell_offer
        self.month_buy_offer: int = month_buy_offer
        self.sold: int = sold
        self.bought: int = bought
        self.name = name
        self.time = time

    def __str__(self) -> str:
        return f"{self.name, self.sell_offer, self.buy_offer, self.month_sell_offer, self.month_buy_offer, self.sold, self.bought, self.time}"


class Client:
    def __init__(self):
        '''
        Starts Tibia, updates it if necessary.
        '''
        # Start Tibia.
        self.tibia: subprocess.Popen = None
        self.market_search_position = None

    def start_game(self, location:str):
        self.tibia: subprocess.Popen = subprocess.Popen([location])
        time.sleep(5)

        self._update_tibia()

    def _update_tibia(self):
        """
        Checks if the update button exists, and if so, updates and starts Tibia.
        """
        update_position = pyautogui.locateCenterOnScreen("images/Update.png")
        if update_position:
            pyautogui.leftClick(update_position)

        # Wait until update is done, and click play button.
        self._wait_until_find("images/PlayButton.png", click=True)

    def login_to_game(self, email: str, password: str):
        """
        Logs into the provided account, and selects the provided character.
        """
        password_position = self._wait_until_find("images/PasswordField.png", click=True)

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
        character_position = self._wait_until_find("images/BotCharacter.png")
        pyautogui.doubleClick(character_position)
        
        # Wait until ingame.
        self._wait_until_find("images/Ingame.png")
        print("Ingame.")

    def exit_tibia(self):
        """
        Closes Tibia unsafely. Probably better to log out before.
        """
        pyautogui.hotkey("alt", "f4")
        self._wait_until_find("images/Exit.png", click=True)

    def open_market(self):
        """
        Searches for an empty depot, and opens the market on it.
        """
        def try_open_market() -> bool:
            x, y = self._wait_until_find("images/SuccessDepotTile.png", timeout=5)
            if x >= 0:
                pyautogui.leftClick(636, 375)
                self._wait_until_find("images/Market.png", click=True)
                self._wait_until_find("images/Details.png")

                while not self.market_search_position:
                    self.market_search_position = pyautogui.locateCenterOnScreen("images/ItemSearch.png")

                print("Market open.")
                return True
            
            return False

        if pyautogui.locateCenterOnScreen("images/SuccessDepotTile.png") and try_open_market():
            return

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
        pyautogui.leftClick(self.market_search_position)
        pyautogui.hotkey("ctrl", "a")
        pyautogui.press("delete")
        pyautogui.typewrite(name)
        self._wait_until_find("images/OffersButton.png", click=True)

        x, y = pyautogui.locateCenterOnScreen("images/AboveFirstItem.png")
        pyautogui.leftClick(x, y + 25)

        offers = list(pyautogui.locateAllOnScreen("images/Offers.png"))
        sell_offers = offers[0]
        buy_offers = offers[1]

        interpreted_buy_offer = screenshot.read_image_text(screenshot.process_image(screenshot.take_screenshot(buy_offers.left, buy_offers.top + buy_offers.height + 3, buy_offers.width, buy_offers.height + 3)))\
            .replace(",", "").replace(".", "").replace(" ", "").split("\n")[0]
        interpreted_sell_offer = screenshot.read_image_text(screenshot.process_image(screenshot.take_screenshot(sell_offers.left, sell_offers.top + sell_offers.height + 3, sell_offers.width, sell_offers.height + 3)))\
            .replace(",", "").replace(".", "").replace(" ", "").split("\n")[0]

        sell_offer = int(interpreted_sell_offer) if interpreted_sell_offer.isnumeric() else -1
        buy_offer = int(interpreted_buy_offer) if interpreted_buy_offer.isnumeric() else -1

        return MarketValues(name, time.time(), sell_offer, buy_offer, 0, 0, 0, 0)

    def _wait_until_find(self, image: str, timeout: int = 1000, click: bool = False) -> Tuple[int, int]:
        while timeout > 0:
            position = pyautogui.locateCenterOnScreen(image)

            if position:
                if click:
                    pyautogui.leftClick(position)
                    
                return position

            timeout -= 1
            time.sleep(1)
        
        return (-1, -1)