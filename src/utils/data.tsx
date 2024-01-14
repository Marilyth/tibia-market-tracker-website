export class NPCSaleData{
    price: number;
    name: string;
    location: string;
    currency_object_type_id: number;
    currency_quest_flag_display_name: string;
  
    constructor(price: number, name: string, location: string, currency_object_type_id: number = 0, currency_quest_flag_display_name: string = ""){
      this.price = price;
      this.name = name;
      this.location = location;
      this.currency_object_type_id = currency_object_type_id;
      this.currency_quest_flag_display_name = currency_quest_flag_display_name;
    }

    public static isGold(data: NPCSaleData) : boolean {
      return data.currency_object_type_id == 0 && data.currency_quest_flag_display_name == "";
    }
}

export class ItemMetaData{
    id: number;
    category: string;
    tier: number;
    name: string;
    npc_buy: Array<NPCSaleData>;
    npc_sell: Array<NPCSaleData>;
    wiki_name: string;

    constructor(id: number, category: string, tier: number, name: string, npc_buy: Array<NPCSaleData>, npc_sell: Array<NPCSaleData>, wiki_name: string){
      this.id = id;
      this.category = category;
      this.tier = tier;
      this.name = name;
      this.npc_buy = npc_buy;
      this.npc_sell = npc_sell;
      this.wiki_name = wiki_name;
    }
}

export class TextMetric{
  name: string;
  value: string;
  localisedValue: string;
  description: string;
  category: string = "";

  constructor(name: string, value: string, description: string, category: string){
    this.name = name;
    this.value = value;
    this.localisedValue = value;
    this.description = description;
    this.category = category;
  }
}

export class Metric{
    name: string;
    value: number;
    localisedValue: string;
    description: string;
    category: string = "";
  
    constructor(name: string, value: number, description: string, category: string, canBeNegative: boolean = true){
      this.name = name;
      this.value = value;
      this.localisedValue = value < 0 && !canBeNegative ? "None" : value.toLocaleString();
      this.description = description;
      this.category = category;
    }
}
  
  export class ItemData{
    sellPrice: Metric;
    buyPrice: Metric;
    averageSellPriceMonth: Metric;
    averageBuyPriceMonth: Metric;
    averageSellPriceDay: Metric;
    averageBuyPriceDay: Metric;
    deltaSellPrice: Metric;
    deltaBuyPrice: Metric;
    lowestSellPriceMonth: Metric;
    lowestBuyPriceMonth: Metric;
    highestSellPriceMonth: Metric;
    highestBuyPriceMonth: Metric;
    lowestSellPriceDay: Metric;
    lowestBuyPriceDay: Metric;
    highestSellPriceDay: Metric;
    highestBuyPriceDay: Metric;
    npcSellPrice: Metric;
    npcBuyPrice: Metric;
    soldAmountMonth: Metric;
    boughtAmountMonth: Metric;
    soldAmountDay: Metric;
    boughtAmountDay: Metric;
    profit: Metric;
    averageProfit: Metric;
    potProfit: Metric;
    npcProfit: Metric;
    npcImmediateProfit: Metric;
    totalNpcImmediateProfit: Metric;
    sellOffers: Metric;
    buyOffers: Metric;
    activeTraders: Metric;
    id: Metric;
    category: TextMetric;
    name: string;
  
    constructor(id: number, name: string, category: string, sellPrice: number, buyPrice: number, 
                averageSellPriceMonth: number, averageBuyPriceMonth: number, lowestSellPriceMonth: number, lowestBuyPriceMonth: number, highestSellPriceMonth: number, highestBuyPriceMonth: number, soldAmountMonth: number, boughtAmountMonth: number, 
                averageSellPriceDay: number, averageBuyPriceDay: number, lowestSellPriceDay: number, lowestBuyPriceDay: number, highestSellPriceDay: number, highestBuyPriceDay: number, soldAmountDay: number, boughtAmountDay: number,
                sellOffers: number, buyOffers: number, activeTraders: number, npcSell: Array<NPCSaleData> = [], npcBuy: Array<NPCSaleData> = [], totalNpcImmediateProfit: number = 0) {
      this.id = new Metric("Item Id", id, "The Tibia internal id of the item.", "Meta data", false);
      this.name = name;
      this.category = new TextMetric("Category", category, "The market category of the item.", "Meta data");
  
      // Available data.
      this.sellPrice = new Metric("Sell Price", sellPrice, "The current lowest sell price of the item.", "Buy & Sell Prices", false);
      this.buyPrice = new Metric("Buy Price", buyPrice, "The current highest buy price of the item.", "Buy & Sell Prices", false);
      
      this.averageSellPriceMonth = new Metric("Avg. Sell Price (mo.)", averageSellPriceMonth, "The average sell price of the item in the past 30 days.", "Average Prices", true);
      this.averageBuyPriceMonth = new Metric("Avg. Buy Price (mo.)", averageBuyPriceMonth, "The average buy price of the item in the past 30 days.", "Average Prices", true);
      this.averageSellPriceDay = new Metric("Avg. Sell Price (day)", averageSellPriceDay, "The average sell price of the item in the past 24 hours.", "Average Prices", true);
      this.averageBuyPriceDay = new Metric("Avg. Buy Price (day)", averageBuyPriceDay, "The average buy price of the item in the past 24 hours.", "Average Prices", true);
      this.deltaSellPrice = new Metric("Delta Sell Price", this.sellPrice.value > 0 ? this.sellPrice.value - this.averageSellPriceMonth.value : 0, "The difference between the current sell price and the average monthly sell price. If this is very negative, this is a great time to buy. If this is very positive, this is a great time to sell.", "Buy & Sell Prices", this.sellPrice.value >= 0);
      this.deltaBuyPrice = new Metric("Delta Buy Price", this.buyPrice.value > 0 ? this.buyPrice.value - this.averageBuyPriceMonth.value : 0, "The difference between the current buy price and the average monthly buy price. If this is very negative, this is a great time to buy. If this is very positive, this is a great time to sell.", "Buy & Sell Prices", this.buyPrice.value >= 0);
      
      this.lowestSellPriceMonth = new Metric("Lowest Sell Price (mo.)", lowestSellPriceMonth, "The lowest sell price of the item in the last 30 days.", "Extreme Prices", false);
      this.lowestBuyPriceMonth = new Metric("Lowest Buy Price (mo.)", lowestBuyPriceMonth, "The lowest buy price of the item in the last 30 days.", "Extreme Prices", false);
      this.highestSellPriceMonth = new Metric("Highest Sell Price (mo.)", highestSellPriceMonth, "The highest sell price of the item in the last 30 days.", "Extreme Prices", false);
      this.highestBuyPriceMonth = new Metric("Highest Buy Price (mo.)", highestBuyPriceMonth, "The highest buy price of the item in the last 30 days.", "Extreme Prices", false);
      this.lowestSellPriceDay = new Metric("Lowest Sell Price (day)", lowestSellPriceDay, "The lowest sell price of the item in the last 24 hours.", "Extreme Prices", false);
      this.lowestBuyPriceDay = new Metric("Lowest Buy Price (day)", lowestBuyPriceDay, "The lowest buy price of the item in the last 24 hours.", "Extreme Prices", false);
      this.highestSellPriceDay = new Metric("Highest Sell Price (day)", highestSellPriceDay, "The highest sell price of the item in the last 24 hours.", "Extreme Prices", false);
      this.highestBuyPriceDay = new Metric("Highest Buy Price (day)", highestBuyPriceDay, "The highest buy price of the item in the last 24 hours.", "Extreme Prices", false);

      this.soldAmountMonth = new Metric("Sold (mo.)", soldAmountMonth, "The amount of items sold in the last 30 days.", "Transaction Amounts", false);
      this.boughtAmountMonth = new Metric("Bought (mo.)", boughtAmountMonth, "The amount of items bought in the last 30 days.", "Transaction Amounts", false);
      this.soldAmountDay = new Metric("Sold (day)", soldAmountDay, "The amount of items sold in the last 24 hours.", "Transaction Amounts", false);
      this.boughtAmountDay = new Metric("Bought (day)", boughtAmountDay, "The amount of items bought in the last 24 hours.", "Transaction Amounts", false);

      this.sellOffers = new Metric("Sell Offers", sellOffers, "The current amount of sell offers for this item.", "Market Activity", false);
      this.buyOffers = new Metric("Buy Offers", buyOffers, "The current amount of buy offers for this item.", "Market Activity", false);
      this.activeTraders = new Metric("Traders", activeTraders, "The amount of buy or sell offers in the last 24 hours, whichever one is smaller. I.e. the amount of other flippers you are competing with.", "Market Activity", false);

      // NPC data.
      npcSell = npcSell.filter((x) => NPCSaleData.isGold(x));
      npcBuy = npcBuy.filter((x) => NPCSaleData.isGold(x));
      this.npcSellPrice = new Metric("NPC Sell Price", npcSell.length > 0 ? Math.min(...npcSell.map((x) => x.price)) : -1, "The lowest price NPCs sell this item for.", "Buy & Sell Prices", false);
      this.npcBuyPrice = new Metric("NPC Buy Price", npcBuy.length > 0 ? Math.max(...npcBuy.map((x) => x.price)) : -1, "The highest price NPCs buy this item for.", "Buy & Sell Prices", false);

      const tax: number = 0.02;
      const maxTax: number = 250000;
  
      // Calculated data.
      var profit = this.sellPrice.value > 0 && this.buyPrice.value > 0 ? Math.round((this.sellPrice.value - this.buyPrice.value) - Math.min(this.sellPrice.value * tax, maxTax)) : 0;
      this.profit = new Metric("Profit", profit, `The profit you would get for flipping this item right now. Minus ${tax} tax.`, "Profit Metrics");
      var avgProfit = this.averageSellPriceMonth.value > 0 && this.averageBuyPriceMonth.value > 0 ? Math.round((this.averageSellPriceMonth.value - this.averageBuyPriceMonth.value) - Math.min(this.sellPrice.value * tax, maxTax)) : 0;
      this.averageProfit = new Metric("Avg. Profit", avgProfit, `The profit you would get on average for flipping this item. Minus ${tax} tax.`, "Profit Metrics");

      var sellToNPCProfit = this.buyPrice.value > 0 && this.npcBuyPrice.value > 0 ? Math.round((this.npcBuyPrice.value - this.buyPrice.value) - Math.min(this.buyPrice.value * tax, maxTax)) : -1;
      var sellToMarketProfit = this.sellPrice.value > 0 && this.npcSellPrice.value > 0 ? Math.round((this.sellPrice.value - this.npcSellPrice.value) - Math.min(this.sellPrice.value * tax, maxTax)) : -1;
      var npcProfit = Math.max(sellToNPCProfit, sellToMarketProfit);

      this.npcProfit = new Metric("NPC Profit", npcProfit == -1 ? 0 : npcProfit, "The profit you would get for flipping this item between the market and NPCs, by adding offers. Minus 2% tax.", "Profit Metrics");

      sellToNPCProfit = this.sellPrice.value > 0 && this.npcBuyPrice.value > 0 ? Math.round((this.npcBuyPrice.value - this.sellPrice.value)) : -1;
      sellToMarketProfit = this.npcSellPrice.value > 0 && this.buyPrice.value > 0 ? Math.round((this.buyPrice.value - this.npcSellPrice.value)) : -1;
      npcProfit = Math.max(sellToNPCProfit, sellToMarketProfit);

      this.npcImmediateProfit = new Metric("NPC Immediate Profit", npcProfit == -1 ? 0 : npcProfit, "The highest profit you can get right now for flipping this item between the market and NPCs once.", "Profit Metrics");
      this.totalNpcImmediateProfit = new Metric("Total NPC Immediate Profit", totalNpcImmediateProfit, "The total profit you can get right now for flipping this item between the market and NPCs, by exhausting all existing offers.", "Profit Metrics", false);

      this.potProfit = new Metric("Potential Profit", this.profit.value * Math.min(this.soldAmountMonth.value, this.boughtAmountMonth.value), "The potential profit of the item, if you were the only trader for 1 month.", "Profit Metrics");
    }
}
  
export var exampleItem: ItemData = new ItemData(1, "Test", "Armors", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, [], []);
  
export class HistoryData{
    buyOffer: number | null;
    buyTrend: number | null;
    sellOffer: number | null;
    sellTrend: number | null;
    buyAmount: number | null;
    sellAmount: number | null;
    activeTraders: number | null;
    time: number;
    events: string[];
  
    constructor(buy: number, sell: number, buyAmount: number, sellAmount: number, activeTraders: number, time: number, events: string[]){
      this.buyOffer = buy > 0 ? buy : null;
      this.sellOffer = sell > 0 ? sell : null;
      this.buyAmount = buyAmount >= 0 ? buyAmount : null;
      this.sellAmount = sellAmount >= 0 ? sellAmount : null;
      this.activeTraders = activeTraders >= 0 ? activeTraders : null;
      this.buyTrend = null;
      this.sellTrend = null;
  
      this.time = time;
      this.events = events;
    }
}
  
export class WeekdayData{
    private buyOffers: number[] = [];
    private sellOffers: number[] = [];
    public static weekdays: string[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    public medianBuyOffer: number = 0;
    public medianSellOffer: number = 0;
  
    weekday: number;
  
    constructor(weekday: number){
      this.weekday = weekday;
    }
  
    /**
     * Adds the prices to the weekday and recalculates the average.
     */
    public addOffer(buyPrice: number, sellPrice: number) {
      this.buyOffers.push(buyPrice);
      this.sellOffers.push(sellPrice);
    }
  
    /**
     * Calculates and sets the median buy and sell offers for this weekday.
     */
    public calculateMedian() {
      this.medianBuyOffer = this.buyOffers.sort((a, b) => a - b)[Math.trunc(this.buyOffers.length / 2)];
      this.medianSellOffer = this.sellOffers.sort((a, b) => a - b)[Math.trunc(this.sellOffers.length / 2)];
    }
}