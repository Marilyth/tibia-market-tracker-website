/**
 * Fetches the list data from the API, according to the inputs, and fills the table with it.
 * @param {string} column The name of the column to be sorted.
 */
async function fetchTable(column){
    await setLoading(true);

    var table = document.getElementById("item-table") as HTMLTableElement;

    for(var i = table.rows.length; i > 1; i--){
        table.deleteRow(i - 1);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    var name = (document.getElementById("name-input") as HTMLInputElement).value;
    var minTraded = (document.getElementById("name-input") as HTMLInputElement).value;
    var maxTraded = (document.getElementById("name-input") as HTMLInputElement).value;
    var minSell = (document.getElementById("name-input") as HTMLInputElement).value;
    var maxSell = (document.getElementById("name-input") as HTMLInputElement).value;
    var minBuy = (document.getElementById("name-input") as HTMLInputElement).value;
    var maxBuy = (document.getElementById("name-input") as HTMLInputElement).value;

    var items = await getItems(20, name, minTraded, maxTraded, minSell, maxSell, minBuy, maxBuy, "name", 1);

    items.forEach(item => {
        var row = table.insertRow();
        item.insertToRow(row);
    });

    await setLoading(false);
}

/**
 * Fetches the getItems endpoint of the API with the given options.
 * @param {number} limit The maximum amount of items to retrieve.
 * @param {string} name The name which the items must contain.
 * @param {number} minTraded The minimum amount of trades the items have per month.
 * @param {number} maxTraded The maximum amount of trades the items have per month.
 * @param {number} minSellPrice The minimum price the items sell for.
 * @param {number} maxSellPrice The maximum price the items sell for.
 * @param {number} minBuyPrice The minimum price the items are bought for.
 * @param {number} maxBuyPrice The maximum price the items are bought for.
 * @param {string} orderBy The value by which to order the list.
 * @param {number} orderDirection The direction, 1 or -1, by which to order the list.
 * @returns The list of items.
 */
async function getItems(limit, name, minTraded, maxTraded, minSellPrice, maxSellPrice, minBuyPrice, maxBuyPrice, orderBy, orderDirection){
    // TODO: Fetch items from API.
    /*var url = `127.0.0.1/getItems?limit=${limit}&name=${name}&minTraded=${minTraded}`+
            `&maxTraded=${maxTraded}&minSellPrice=${minSellPrice}&maxSellPrice=${maxSellPrice}`+
            `&minBuyPrice=${minBuyPrice}&maxBuyPrice=${maxBuyPrice}&orderBy=${orderBy}&orderDirection=${orderDirection}`

    var items = await fetch(url).then(response => {
        if(response.status != 200){
            throw new Error("Fetching items failed!");
        }

        return response.json();
    });*/

    return [new MarketValues(10, 5, 7, 7, 10, 20, "Ham", 0),
            new MarketValues(12, 2, 10, 3, 100, 120, "Meat", 0)];
}

/**
 * Fetches the getItemDetails endpoint of the API for the given item name.
 * @param {string} name The name of the item to retrieve details for.
 * @returns The details of the item.
 */
async function getItemDetails(name){
    // TODO: Fetch items from API.
    var url = `127.0.0.1/getItemDetails?name=${name}`

    var items = await fetch(url).then(response => {
        if(response.status != 200){
            throw new Error("Fetching items failed!");
        }

        return response.json();
    });

    return items;
}

/**
 * Sets the page to appear loading, or reverts it.
 * @param isLoading 
 */
async function setLoading(isLoading){
    var button = document.getElementById("search-button") as HTMLButtonElement;
    var table = document.getElementById("item-table") as HTMLTableElement;
    var loadingRing = document.getElementById("loading-ring");

    if (isLoading){
        button.disabled = true;
        table.style.opacity = "0";
        loadingRing.style.opacity = "1";
    } else {
        button.disabled = false;
        table.style.opacity = "1";
        loadingRing.style.opacity = "0";
    }

    // Wait for transitions to finish.
    await new Promise(resolve => setTimeout(resolve, 150));
}

class MarketValues{
    sellOffer: number
    buyOffer: number
    monthSellOffer: number
    monthBuyOffer: number
    sold: number
    bought: number
    name: string
    time: number
    traded: number
    totalProfit: number
    relativeProfit: string

    constructor(sellOffer: number, buyOffer: number, monthSellOffer: number, monthBuyOffer: number,
        sold: number, bought: number, name: string, time: number){
        this.sellOffer = sellOffer;
        this.buyOffer = buyOffer;
        this.monthBuyOffer = monthBuyOffer;
        this.monthSellOffer = monthSellOffer;
        this.sold = sold;
        this.bought = bought;
        this.name = name;
        this.time = time;

        this.traded = sold + bought;
        this.totalProfit = sellOffer - buyOffer;
        this.relativeProfit = `${(sellOffer / buyOffer) * 100}%`;
    }

    insertToRow(row: HTMLTableRowElement){
        var name = row.insertCell();
        name.textContent = this.name;

        var sellOffer = row.insertCell();
        sellOffer.textContent = this.sellOffer.toString();

        var buyOffer = row.insertCell();
        buyOffer.textContent = this.buyOffer.toString();

        var traded = row.insertCell();
        traded.textContent = this.traded.toString();

        var totalProfit = row.insertCell();
        totalProfit.textContent = this.totalProfit.toString();

        var relativeProfit = row.insertCell();
        relativeProfit.textContent = this.relativeProfit;
    }
}