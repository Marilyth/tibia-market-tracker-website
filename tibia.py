import pyautogui
import subprocess
import time
from typing import *


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


class Client:
    def __init__(self, email: str, password: str):
        '''
        Starts Tibia, updates it if necessary, logs in and opens the market.
        '''
        # Start Tibia.
        self.tibia: subprocess.Popen = subprocess.Popen(["exec", "./Tibia"])
        time.sleep(5)

        self.update_tibia()
        self.login_to_game(email, password)
        self.open_market()

    def _update_tibia(self):
        """
        Checks if the update button exists, and if so, updates and starts Tibia.
        """
        update_position = pyautogui.locateCenterOnScreen("images/Update.png")
        if update_position:
            pyautogui.leftClick(update_position)

            # Wait until update is done, and click play button.
            while True:
                play_position = pyautogui.locateCenterOnScreen("images/Play.png")
                if play_position:
                    pyautogui.leftClick(play_position)
                    break
                else:
                    time.sleep(5)

    def _login_to_game(self, email: str, password: str):
        """
        Logs into the provided account, and selects the provided character.
        """
        email_position = None

        while not email_position:
            email_position = pyautogui.locateCenterOnScreen("images/EmailField.png")
            if not email_position:
                time.sleep(5)
        
        pyautogui.leftClick(email_position)
        pyautogui.typewrite(email)

        password_position = pyautogui.locateCenterOnScreen("images/PasswordField.png")
        pyautogui.leftClick(password_position)
        pyautogui.typewrite(password)

        # Go ingame.
        while True:
            character_position = pyautogui.locateCenterOnScreen("images/BotCharacter.png")

            if character_position:
                pyautogui.doubleClick(character_position)
                break
            else:
                time.sleep(5)
        
        # Wait until ingame.
        while not pyautogui.locateCenterOnScreen("images/Equipment.png"):
            time.sleep(5)

    def exit_tibia(self):
        """
        Closes Tibia unsafely. Probably better to log out before.
        """
        tibia.terminate()

    def _open_market(self):
        """
        Searches for an empty depot, and opens the market on it.
        """
        # TODO

    def search_item(self, name: str) -> MarketValues:
        """
        Searches for the specified item in the market, and returns its current highest feasible buy and sell offers, and values for the month.
        """
        # TODO

