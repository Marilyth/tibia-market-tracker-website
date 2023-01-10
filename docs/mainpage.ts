/**
 * Fetches the list data from the API, according to the inputs, and fills the table with it.
 */
async function fetchTable(){
    await setLoading(true);
    hideError();

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
    var orderBy = (document.getElementById("order-by") as HTMLSelectElement).value;
    var orderDir = +(document.getElementById("order-dir") as HTMLSelectElement).value;

    var items = await getItems(name, minTraded, maxTraded, minSell, maxSell, minBuy, maxBuy, orderBy, orderDir);

    items.forEach(item => {
        var row = table.insertRow();
        item.insertToRow(row);
    });

    await setLoading(false);
}

/**
 * Fetches the getItems endpoint of the API with the given options.
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
async function getItems(name, minTraded, maxTraded, minSellPrice, maxSellPrice, minBuyPrice, maxBuyPrice, orderBy, orderDirection){
    // TODO: Fetch items from API.
    var url = `http://127.0.0.1:5000/get_items?name=${name}&minTraded=${minTraded}`+
            `&maxTraded=${maxTraded}&minSellPrice=${minSellPrice}&maxSellPrice=${maxSellPrice}`+
            `&minBuyPrice=${minBuyPrice}&maxBuyPrice=${maxBuyPrice}&orderBy=${orderBy}&orderDirection=${orderDirection}`

    try {
        var items = await fetch(url).then(response => {
            if(response.status != 200){
                setLoading(false);
                showError(response.statusText);
                throw new Error("Fetching items failed!");
            }
    
            return response.json();
        });

        var itemsList: MarketValues[] = [];
        items.forEach(item => {
            itemsList.push(new MarketValues(item.SellPrice, item.BuyPrice, item.AvgSellPrice, item.AvgBuyPrice,
                                            item.Sold, item.Bought, item.RelProfit, item.PotProfit, item.Name));
        });

        return itemsList
    } catch (error) {
        setLoading(false);
        showError(error.toString());
    }
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

function showError(message: string){
    var div = document.getElementById("error-message") as HTMLDivElement;
    div.innerText = message;
    div.style.display = "block";
}

function hideError(){
    var div = document.getElementById("error-message") as HTMLDivElement;
    div.innerText = "";
    div.style.display = "none";
}

class MarketValues{
    sellOffer: number
    buyOffer: number
    monthSellOffer: number
    monthBuyOffer: number
    sold: number
    bought: number
    name: string
    traded: number
    totalProfit: number
    relativeProfit: number
    potentialProfit: number

    constructor(sellOffer: number, buyOffer: number, monthSellOffer: number, monthBuyOffer: number,
        sold: number, bought: number, relativeProfit: number, potentialProfit: number, name: string){
        this.sellOffer = sellOffer;
        this.buyOffer = buyOffer;
        this.monthBuyOffer = monthBuyOffer;
        this.monthSellOffer = monthSellOffer;
        this.sold = sold;
        this.bought = bought;
        this.name = name;
        this.potentialProfit = potentialProfit;
        this.relativeProfit = relativeProfit;

        this.traded = sold + bought;
        this.totalProfit = sellOffer - buyOffer;
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
        relativeProfit.textContent = `${this.relativeProfit * 100}%`;

        var potentialProfit = row.insertCell();
        potentialProfit.textContent = this.potentialProfit.toString();
    }
}