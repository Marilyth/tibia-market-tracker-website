import { unixTimeToTimeAgo } from './Timestamp';
import { linearRegressionLeastSquares } from './math'

export class WorldData{
    name: string;
    last_update: string;

    constructor(name: string, last_update: string){
        this.name = name;
        this.last_update = last_update;
    }
}

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

    constructor(meta_data: {[key: string]: any}){
      this.id = meta_data["id"];
      this.category = meta_data["category"];
      this.tier = meta_data["tier"];
      this.name = meta_data["name"];
      this.npc_buy = meta_data["npc_buy"];
      this.npc_sell = meta_data["npc_sell"];
      this.wiki_name = meta_data["wiki_name"];
    }
}

export class TextMetric{
  name: string;
  value: string;
  localisedValue: string;
  description: string;
  category: string = "";
  additionalInfo: string;

  constructor(name: string, value: string, description: string, category: string, additionalInfo: string = "") {
    this.name = name;
    this.value = value;
    this.localisedValue = value;
    this.description = description;
    this.category = category;
    this.additionalInfo = additionalInfo;
  }
}

export class Metric{
    name: string;
    value: number;
    localisedValue: string;
    description: string;
    category: string = "";
    additionalInfo: string;
  
    constructor(name: string, value: number, description: string, category: string, canBeNegative: boolean = true, additionalInfo: string = "", toLocaleStringFunction: (value: number) => string = (value) => value.toLocaleString()) {
      this.name = name;
      this.value = value;
      this.localisedValue = value < 0 && !canBeNegative ? "None" : toLocaleStringFunction(value);
      this.description = description;
      this.category = category;
      this.additionalInfo = additionalInfo;
    }
}
  
  export class ItemData{
    sell_offer: Metric;
    buy_offer: Metric;
    month_average_sell: Metric;
    month_average_buy: Metric;
    day_average_sell: Metric;
    day_average_buy: Metric;
    delta_sell_offer: Metric;
    delta_buy_offer: Metric;
    month_lowest_sell: Metric;
    month_lowest_buy: Metric;
    month_highest_sell: Metric;
    month_highest_buy: Metric;
    day_lowest_sell: Metric;
    day_lowest_buy: Metric;
    day_highest_sell: Metric;
    day_highest_buy: Metric;
    npc_sell_price: Metric;
    npc_buy_price: Metric;
    month_sold: Metric;
    month_bought: Metric;
    day_sold: Metric;
    day_bought: Metric;
    profit: Metric;
    average_profit: Metric;
    potential_profit: Metric;
    npc_profit: Metric;
    npc_immediate_profit: Metric;
    total_immediate_profit: Metric;
    sell_offers: Metric;
    buy_offers: Metric;
    active_traders: Metric;
    id: Metric;
    category: TextMetric;
    time: Metric;
    name: string;
  
    constructor(item: {[key: string]: any}, meta_data: ItemMetaData) {
      this.id = new Metric("Item Id", item["id"], "The Tibia internal id of the item.", "Meta data", false);
      this.time = new Metric("Time", item["time"], "The time the data was collected.", "Meta data", false, "", (value) => unixTimeToTimeAgo(value));

      // Available data.
      this.sell_offer = new Metric("Sell Price", item["sell_offer"], "The current lowest sell price of the item.", "Buy & Sell Prices", false);
      this.buy_offer = new Metric("Buy Price", item["buy_offer"], "The current highest buy price of the item.", "Buy & Sell Prices", false);
      
      this.month_average_sell = new Metric("Avg. Sell Price (mo.)", item["month_average_sell"], "The average sell price of the item in the past 30 days.", "Average Prices", true);
      this.month_average_buy = new Metric("Avg. Buy Price (mo.)", item["month_average_buy"], "The average buy price of the item in the past 30 days.", "Average Prices", true);
      this.day_average_sell = new Metric("Avg. Sell Price (day)", item["day_average_sell"], "The average sell price of the item in the past 24 hours.", "Average Prices", true);
      this.day_average_buy = new Metric("Avg. Buy Price (day)", item["day_average_buy"], "The average buy price of the item in the past 24 hours.", "Average Prices", true);
      this.delta_sell_offer = new Metric("Delta Sell Price", this.sell_offer.value > 0 ? this.sell_offer.value - this.month_average_sell.value : 0, "The difference between the current sell price and the average monthly sell price. If this is very negative, this is a great time to buy. If this is very positive, this is a great time to sell.", "Buy & Sell Prices", this.sell_offer.value >= 0);
      this.delta_buy_offer = new Metric("Delta Buy Price", this.buy_offer.value > 0 ? this.buy_offer.value - this.month_average_buy.value : 0, "The difference between the current buy price and the average monthly buy price. If this is very negative, this is a great time to buy. If this is very positive, this is a great time to sell.", "Buy & Sell Prices", this.buy_offer.value >= 0);
      
      this.month_lowest_sell = new Metric("Lowest Sell Price (mo.)", item["month_lowest_sell"], "The lowest sell price of the item in the last 30 days.", "Extreme Prices", false);
      this.month_lowest_buy = new Metric("Lowest Buy Price (mo.)", item["month_lowest_buy"], "The lowest buy price of the item in the last 30 days.", "Extreme Prices", false);
      this.month_highest_sell = new Metric("Highest Sell Price (mo.)", item["month_highest_sell"], "The highest sell price of the item in the last 30 days.", "Extreme Prices", false);
      this.month_highest_buy = new Metric("Highest Buy Price (mo.)", item["month_highest_buy"], "The highest buy price of the item in the last 30 days.", "Extreme Prices", false);
      this.day_lowest_sell = new Metric("Lowest Sell Price (day)", item["day_lowest_sell"], "The lowest sell price of the item in the last 24 hours.", "Extreme Prices", false);
      this.day_lowest_buy = new Metric("Lowest Buy Price (day)", item["day_lowest_buy"], "The lowest buy price of the item in the last 24 hours.", "Extreme Prices", false);
      this.day_highest_sell = new Metric("Highest Sell Price (day)", item["day_highest_sell"], "The highest sell price of the item in the last 24 hours.", "Extreme Prices", false);
      this.day_highest_buy = new Metric("Highest Buy Price (day)", item["day_highest_buy"], "The highest buy price of the item in the last 24 hours.", "Extreme Prices", false);

      this.month_sold = new Metric("Sold (mo.)", item["month_sold"], "The amount of items sold in the last 30 days.", "Transaction Amounts", false);
      this.month_bought = new Metric("Bought (mo.)", item["month_bought"], "The amount of items bought in the last 30 days.", "Transaction Amounts", false);
      this.day_sold = new Metric("Sold (day)", item["day_sold"], "The amount of items sold in the last 24 hours.", "Transaction Amounts", false);
      this.day_bought = new Metric("Bought (day)", item["day_bought"], "The amount of items bought in the last 24 hours.", "Transaction Amounts", false);

      this.sell_offers = new Metric("Sell Offers", item["sell_offers"], "The current amount of sell offers for this item.", "Market Activity", false);
      this.buy_offers = new Metric("Buy Offers", item["buy_offers"], "The current amount of buy offers for this item.", "Market Activity", false);
      this.active_traders = new Metric("Traders", item["active_traders"], "The amount of buy or sell offers in the last 24 hours, whichever one is smaller. I.e. the amount of other flippers you are competing with.", "Market Activity", false);

      const tax: number = 0.02;
      const maxTax: number = 250000;
  
      // Calculated data.
      var profit = this.sell_offer.value > 0 && this.buy_offer.value > 0 ? Math.round((this.sell_offer.value - this.buy_offer.value) - Math.min(this.sell_offer.value * tax, maxTax)) : 0;
      this.profit = new Metric("Profit", profit, `The profit you would get for flipping this item right now. Minus ${tax} tax.`, "Profit Metrics");
      var avgProfit = this.month_average_sell.value > 0 && this.month_average_buy.value > 0 ? Math.round((this.month_average_sell.value - this.month_average_buy.value) - Math.min(this.sell_offer.value * tax, maxTax)) : 0;
      this.average_profit = new Metric("Avg. Profit", avgProfit, `The profit you would get on average for flipping this item. Minus ${tax} tax.`, "Profit Metrics");

      if(meta_data != null){
        this.name = meta_data.wiki_name ? meta_data.wiki_name : meta_data.name;

        // NPC data.
        var npc_sell = meta_data.npc_sell.filter((x) => NPCSaleData.isGold(x)).sort((a, b) => a.price - b.price);
        var npc_buy = meta_data.npc_buy.filter((x) => NPCSaleData.isGold(x)).sort((a, b) => b.price - a.price);
        this.npc_sell_price = new Metric("NPC Sell Price", npc_sell.length > 0 ? npc_sell[npc_sell.length - 1].price : -1, "The lowest price NPCs sell this item for.", "Buy & Sell Prices", false, npc_sell.length > 0 ? `${npc_sell[npc_sell.length - 1].name} in ${npc_sell[npc_sell.length - 1].location}` : "");
        this.npc_buy_price = new Metric("NPC Buy Price", npc_buy.length > 0 ? npc_buy[0].price : -1, "The highest price NPCs buy this item for.", "Buy & Sell Prices", false, npc_buy.length > 0 ? `${npc_buy[0].name} in ${npc_buy[0].location}` : "");
        this.category = new TextMetric("Category", meta_data.category, "The market category of the item.", "Meta data");

        var sellToNPCProfit = this.buy_offer.value > 0 && this.npc_buy_price.value > 0 ? Math.round((this.npc_buy_price.value - this.buy_offer.value) - Math.min(this.buy_offer.value * tax, maxTax)) : -1;
        var sellToMarketProfit = this.sell_offer.value > 0 && this.npc_sell_price.value > 0 ? Math.round((this.sell_offer.value - this.npc_sell_price.value) - Math.min(this.sell_offer.value * tax, maxTax)) : -1;
        var npcProfit = Math.max(sellToNPCProfit, sellToMarketProfit);

        this.npc_profit = new Metric("NPC Profit", npcProfit == -1 ? 0 : npcProfit, "The profit you would get for flipping this item between the market and NPCs, by adding offers. Minus 2% tax.", "Profit Metrics");

        sellToNPCProfit = this.sell_offer.value > 0 && this.npc_buy_price.value > 0 ? Math.round((this.npc_buy_price.value - this.sell_offer.value)) : -1;
        sellToMarketProfit = this.npc_sell_price.value > 0 && this.buy_offer.value > 0 ? Math.round((this.buy_offer.value - this.npc_sell_price.value)) : -1;
        npcProfit = Math.max(sellToNPCProfit, sellToMarketProfit);
        var npcProfitAdditionalInfo = "";

        if (npcProfit > 0) {
          if (sellToNPCProfit > sellToMarketProfit) {
            var npc_offer = npc_buy[0];
            console.log(npc_offer);
            npcProfitAdditionalInfo = `Buy for ${this.sell_offer.value} from Market.\nSell to NPC ${npc_offer.name} in ${npc_offer.location} for ${npc_offer.price}.\n${sellToNPCProfit} profit.`;
          }
          else {
            var npc_offer = npc_sell[npc_sell.length - 1];
            console.log(npc_offer);
            npcProfitAdditionalInfo = `Buy for ${npc_offer.price} from NPC ${npc_offer.name} in ${npc_offer.location}.\nSell to Market for ${this.buy_offer.value}.\n${sellToMarketProfit} profit.`;
          }
        }

        this.npc_immediate_profit = new Metric("NPC Immediate Profit", npcProfit == -1 ? 0 : npcProfit, "The highest profit you can get right now for flipping this item between the market and NPCs once.", "Profit Metrics", false, npcProfitAdditionalInfo);
        this.total_immediate_profit = new Metric("Total NPC Immediate Profit", item["total_immediate_profit"], "The total profit you can get right now for flipping this item between the market and NPCs, by exhausting all existing offers.", "Profit Metrics", false, item["total_immediate_profit_info"]);
      }
      else{
        this.name = `${this.id} (Unknown)`;
        this.npc_sell_price = new Metric("NPC Sell Price", -1, "The lowest price NPCs sell this item for.", "Buy & Sell Prices", false);
        this.npc_buy_price = new Metric("NPC Buy Price", -1, "The highest price NPCs buy this item for.", "Buy & Sell Prices", false);
        this.category = new TextMetric("Category", "Unknown", "The market category of the item.", "Meta data");
        this.npc_profit = new Metric("NPC Profit", -1, "The profit you would get for flipping this item between the market and NPCs, by adding offers. Minus 2% tax.", "Profit Metrics");
        this.npc_immediate_profit = new Metric("NPC Immediate Profit", -1, "The highest profit you can get right now for flipping this item between the market and NPCs once.", "Profit Metrics", false);
        this.total_immediate_profit = new Metric("Total NPC Immediate Profit", -1, "The total profit you can get right now for flipping this item between the market and NPCs, by exhausting all existing offers.", "Profit Metrics", false);
      }

      this.potential_profit = new Metric("Potential Profit", this.profit.value * Math.min(this.month_sold.value, this.month_bought.value), "The potential profit of the item, if you were the only trader for 1 month.", "Profit Metrics");
    }
}

export var exampleMetaData: ItemMetaData = new ItemMetaData({
  "id": 1,
  "category": "Weapons",
  "tier": 1,
  "name": "Sword",
  "npc_buy": [
  ],
  "npc_sell": [
  ],
  "wiki_name": "Sword"
});

export var exampleItem: ItemData = new ItemData({
  "id": 22118,
  "time": 1703821820.7874076,
  "buy_offer": 36133,
  "sell_offer": 36420,
  "month_average_sell": 37734,
  "month_average_buy": 36947,
  "month_sold": 8315,
  "month_bought": 15942,
  "active_traders": 12,
  "month_highest_sell": 41000,
  "month_lowest_buy": 1,
  "month_lowest_sell": 34500,
  "month_highest_buy": 39511,
  "buy_offers": 32,
  "sell_offers": 32,
  "day_average_sell": -1,
  "day_average_buy": -1,
  "day_sold": -1,
  "day_bought": -1,
  "day_highest_sell": -1,
  "day_lowest_sell": -1,
  "day_highest_buy": -1,
  "day_lowest_buy": -1,
  "total_immediate_profit": -1,
  "total_immediate_profit_info": ""
}, exampleMetaData);

export var weekDays: string[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Returns the Tibian weekday of the given time.
 * I.e. subtract 9 hours to make days start at server-save. (technically 8 hours CET, 9 hours CEST, but this is easier)
 */
export function getWeekday(time: number) : number {
    return new Date((time - 32400) * 1000).getUTCDay();
}

/**
 * Returns the weekday name of the given weekday.
 */
export function getWeekdayName(weekday: number) : string {
    return weekDays[weekday];
}

/**
 * Returns the events for the given timestamp.
 */
export function timestampToEvents(unixTimestamp: number, events: { [date: string]: string[]}) : string[] {
  var dateTime: Date = new Date(unixTimestamp * 1000);
  var dateKey = `${dateTime.getUTCFullYear()}-${(dateTime.getUTCMonth() + 1).toString().padStart(2, "0")}-${(dateTime.getUTCDate()).toString().padStart(2, "0")}T00:00:00`;

  return dateKey in events ? events[dateKey] : [];
}

/**
 * Replaces the newlines of a string with HTML breaks.
 * @param text 
 * @returns 
 */
export function newLineToBreaks(text: string) : any {
  return text.split("\n").map((item, key) => {
    return <span key={key}>{item}<br/></span>
  });
}

/**
 * A class that holds data for a single time point.
 */
export class CustomHistoryData{
    data: {[name: string]: any} = {};
    time: number;
    events: string[];
  
    constructor(time: number, events: string[]){
      this.time = time;
      this.events = events;
    }

    /**
     * Adds the data to the history data.
     */
    public addData(name: string, value: number, canBeNegative: boolean = false){
      if(value == null || value == undefined || (value < 0 && !canBeNegative)){
        return;
      }

      this.data[name] = value;
    }

    /**
     * Returns the data as a dynamic object to be used with charts.
     */
    public asDynamic() : {[name: string]: number} {
      var dynamicData: {[name: string]: any} = {};
      for(var name in this.data){
        dynamicData[name] = this.data[name];
      }

      dynamicData["time"] = this.time;
      dynamicData["events"] = this.events;

      return dynamicData;
    }
}

export class CustomTimeGraph{
    data: CustomHistoryData[] = [];
    colours: {[name: string]: string} = {};
    labels: {[name: string]: string} = {};
    isWeekdayGraph: boolean = false;

    /**
     * Adds the data to the time data.
     */
    public addData(historyData: CustomHistoryData){
      this.data.push(historyData);
    }

    /**
     * Adds a colour to the graph.
     */
    public addDetail(name: string, colour: string, label: string){
      this.colours[name] = colour;
      this.colours[name + "Trend"] = colour + "77";
      this.labels[name] = label;
      this.labels[name + "Trend"] = label + " Trend Hidden";
    }

    /**
     * Calculates and sets the trend values for each data point using linear regression.
     */
    public calculateTrend() {
      for(var name in this.labels){
        var x_values: number[] = [];
        var y_values: any[] = [];

        for(var i = 0; i < this.data.length; i++){
          if (this.data[i].data[name] == null || this.data[i].data[name] == undefined || this.data[i].data[name] < 0)
            continue;

          x_values.push(this.data[i].time);
          y_values.push(this.data[i].data[name]);
        }
        
        var trend = linearRegressionLeastSquares(x_values, y_values);

        for(var i = 0; i < this.data.length; i++){
          var trendValue = trend.m * this.data[i].time + trend.b;
          this.data[i].addData(name + "Trend", trendValue > 0 ? trendValue : 0);
        }
      }
    }
}