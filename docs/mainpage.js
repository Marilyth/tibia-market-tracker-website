var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
/**
 * Fetches the list data from the API, according to the inputs, and fills the table with it.
 * @param {string} column The name of the column to be sorted.
 */
function fetchTable(column) {
    return __awaiter(this, void 0, void 0, function () {
        var table, i, name, minTraded, maxTraded, minSell, maxSell, minBuy, maxBuy, items;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setLoading(true);
                    table = document.getElementById("item-table");
                    for (i = table.rows.length; i > 1; i--) {
                        table.deleteRow(i - 1);
                    }
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                case 1:
                    _a.sent();
                    name = document.getElementById("name-input").value;
                    minTraded = document.getElementById("name-input").value;
                    maxTraded = document.getElementById("name-input").value;
                    minSell = document.getElementById("name-input").value;
                    maxSell = document.getElementById("name-input").value;
                    minBuy = document.getElementById("name-input").value;
                    maxBuy = document.getElementById("name-input").value;
                    return [4 /*yield*/, getItems(20, name, minTraded, maxTraded, minSell, maxSell, minBuy, maxBuy, "name", 1)];
                case 2:
                    items = _a.sent();
                    items.forEach(function (item) {
                        var row = table.insertRow();
                        item.insertToRow(row);
                    });
                    setLoading(false);
                    return [2 /*return*/];
            }
        });
    });
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
function getItems(limit, name, minTraded, maxTraded, minSellPrice, maxSellPrice, minBuyPrice, maxBuyPrice, orderBy, orderDirection) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
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
            return [2 /*return*/, [new MarketValues(10, 5, 7, 7, 10, 20, "Ham", 0),
                    new MarketValues(12, 2, 10, 3, 100, 120, "Meat", 0)]];
        });
    });
}
/**
 * Fetches the getItemDetails endpoint of the API for the given item name.
 * @param {string} name The name of the item to retrieve details for.
 * @returns The details of the item.
 */
function getItemDetails(name) {
    return __awaiter(this, void 0, void 0, function () {
        var url, items;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "127.0.0.1/getItemDetails?name=".concat(name);
                    return [4 /*yield*/, fetch(url).then(function (response) {
                            if (response.status != 200) {
                                throw new Error("Fetching items failed!");
                            }
                            return response.json();
                        })];
                case 1:
                    items = _a.sent();
                    return [2 /*return*/, items];
            }
        });
    });
}
/**
 * Sets the page to appear loading, or reverts it.
 * @param isLoading
 */
function setLoading(isLoading) {
    var button = document.getElementById("search-button");
    var loadingRing = document.getElementById("loading-ring");
    if (isLoading) {
        button.disabled = true;
        loadingRing.style.display = "inline-block";
    }
    else {
        button.disabled = false;
        loadingRing.style.display = "none";
    }
}
var MarketValues = /** @class */ (function () {
    function MarketValues(sellOffer, buyOffer, monthSellOffer, monthBuyOffer, sold, bought, name, time) {
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
        this.relativeProfit = "".concat((sellOffer / buyOffer) * 100, "%");
    }
    MarketValues.prototype.insertToRow = function (row) {
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
    };
    return MarketValues;
}());
//# sourceMappingURL=mainpage.js.map