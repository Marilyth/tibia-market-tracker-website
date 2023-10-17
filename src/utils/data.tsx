export class Metric{
    name: string;
    value: number;
    localisedValue: string;
    description: string;
  
    constructor(name: string, value: number, description: string, canBeNegative: boolean = true){
      this.name = name;
      this.value = value;
      this.localisedValue = value < 0 && !canBeNegative ? "None" : value.toLocaleString();
      this.description = description;
    }
  }
  
  export class ItemData{
    sellPrice: Metric;
    buyPrice: Metric;
    averageSellPrice: Metric;
    averageBuyPrice: Metric;
    deltaSellPrice: Metric;
    deltaBuyPrice: Metric;
    lowestSellPrice: Metric;
    lowestBuyPrice: Metric;
    highestSellPrice: Metric;
    highestBuyPrice: Metric;
    soldAmount: Metric;
    boughtAmount: Metric;
    profit: Metric;
    averageProfit: Metric;
    potProfit: Metric;
    sellOffers: Metric;
    buyOffers: Metric;
    activeTraders: Metric;
    name: string;
  
    constructor(name: string, sellPrice: number, buyPrice: number, averageSellPrice: number, averageBuyPrice: number, lowestSellPrice: number, lowestBuyPrice: number, highestSellPrice: number, highestBuyPrice: number, soldAmount: number, boughtAmount: number, sellOffers: number, buyOffers: number, activeTraders: number){
      this.name = name;
  
      // Available data.
      this.sellPrice = new Metric("Sell Price", sellPrice, "The current sell price of the item.", false);
      this.buyPrice = new Metric("Buy Price", buyPrice, "The current buy price of the item.", false);
      this.averageSellPrice = new Metric("Avg. Sell Price", averageSellPrice, "The average sell price of the item.", true);
      this.averageBuyPrice = new Metric("Avg. Buy Price", averageBuyPrice, "The average buy price of the item.", true);
      this.deltaSellPrice = new Metric("Delta Sell Price", this.sellPrice.value > 0 ? this.sellPrice.value - this.averageSellPrice.value : 0, "The difference between the current sell price and the average sell price. If this is very negative, this is a great time to buy. If this is very positive, this is a great time to sell.", this.sellPrice.value >= 0);
      this.deltaBuyPrice = new Metric("Delta Buy Price", this.buyPrice.value > 0 ? this.buyPrice.value - this.averageBuyPrice.value : 0, "The difference between the current buy price and the average buy price. If this is very negative, this is a great time to buy. If this is very positive, this is a great time to sell.", this.buyPrice.value >= 0);
      this.lowestSellPrice = new Metric("Lowest Sell Price", lowestSellPrice, "The lowest sell price of the item in the last 30 days.", false);
      this.lowestBuyPrice = new Metric("Lowest Buy Price", lowestBuyPrice, "The lowest buy price of the item in the last 30 days.", false);
      this.highestSellPrice = new Metric("Highest Sell Price", highestSellPrice, "The highest sell price of the item in the last 30 days.", false);
      this.highestBuyPrice = new Metric("Highest Buy Price", highestBuyPrice, "The highest buy price of the item in the last 30 days.", false);
      this.soldAmount = new Metric("Sold", soldAmount, "The amount of items sold in the last 30 days.", false);
      this.boughtAmount = new Metric("Bought", boughtAmount, "The amount of items bought in the last 30 days.", false);
      this.sellOffers = new Metric("Sell Offers", sellOffers, "The current amount of sell offers for this item.", false);
      this.buyOffers = new Metric("Buy Offers", buyOffers, "The current amount of buy offers for this item.", false);
      this.activeTraders = new Metric("Traders", activeTraders, "The amount of buy or sell offers in the last 24 hours, whichever one is smaller. I.e. the amount of other flippers you are competing with.", false);
  
      const tax: number = 0.02;
      const maxTax: number = 250000;
  
      // Calculated data.
      var profit = this.sellPrice.value > 0 && this.buyPrice.value > 0 ? Math.round((this.sellPrice.value - this.buyPrice.value) - Math.min(this.sellPrice.value * tax, maxTax)) : 0;
      this.profit = new Metric("Profit", profit, `The profit you would get for flipping this item right now. Minus ${tax} tax.`);
      var avgProfit = this.averageSellPrice.value > 0 && this.averageBuyPrice.value > 0 ? Math.round((this.averageSellPrice.value - this.averageBuyPrice.value) - Math.min(this.sellPrice.value * tax, maxTax)) : 0;
      this.averageProfit = new Metric("Avg. Profit", avgProfit, `The profit you would get on average for flipping this item. Minus ${tax} tax.`);
  
      this.potProfit = new Metric("Potential Profit", this.profit.value * Math.min(this.soldAmount.value, this.boughtAmount.value), "The potential profit of the item, if you were the only trader for 1 month.");
    }
}
  
export var exampleItem: ItemData = new ItemData("Example", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13);
  
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