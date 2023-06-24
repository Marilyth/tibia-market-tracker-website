import React, { useEffect, useState }  from 'react';
import type { MenuProps } from 'antd';
import { Layout, Collapse, Tooltip as AntTooltip, Menu, theme, Select, Button, Input, ConfigProvider, InputNumber, Space, Switch, Table, Typography, Pagination, Image, Modal, Alert, AlertProps, Form } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import {LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ResponsiveContainer, Tooltip, Brush} from 'recharts';
import './App.css';
import ReactGA from 'react-ga4';
import { ColumnType } from 'antd/es/table';

const { Header, Content, Footer, Sider } = Layout;
const { Title } = Typography;
const { Panel } = Collapse;
const TRACKING_ID = "G-PQTKQ22GF1";
ReactGA.initialize(TRACKING_ID);
ReactGA.send("pageview");

var events: { [date: string]: string[]} = {}
var itemNames: {[lowerCaseName: string]: string} = {}

class Metric{
  name: string;
  value: number;
  localisedValue: string;
  description: string;
  isHidden: boolean;

  constructor(name: string, value: number, description: string, isHidden: boolean = false, canBeNegative: boolean = true){
    this.name = name;
    this.value = value;
    this.localisedValue = value < 0 && !canBeNegative ? "None" : value.toLocaleString();
    this.description = description;
    this.isHidden = isHidden;
  }
}

class ItemData{
  sellPrice: Metric;
  buyPrice: Metric;
  averageSellPrice: Metric;
  averageBuyPrice: Metric;
  deltaSellPrice: Metric;
  deltaBuyPrice: Metric;
  soldAmount: Metric;
  boughtAmount: Metric;
  profit: Metric;
  averageProfit: Metric;
  potProfit: Metric;
  activeTraders: Metric;
  name: string;

  constructor(name: string, ...values: any[]){
    this.name = name;
    values = values[0];

    // Available data.
    this.sellPrice = new Metric("Sell Price", +values[0], "The current sell price of the item.", false, false);
    this.buyPrice = new Metric("Buy Price", +values[1], "The current buy price of the item.", false, false);
    this.averageSellPrice = new Metric("Avg. Sell Price", +values[2], "The average sell price of the item.", true, false);
    this.averageBuyPrice = new Metric("Avg. Buy Price", +values[3], "The average buy price of the item.", true, false);
    this.deltaSellPrice = new Metric("Delta Sell Price", this.sellPrice.value > 0 ? this.sellPrice.value - this.averageSellPrice.value : 0, "The difference between the current sell price and the average sell price. If this is very negative, this is a great time to buy. If this is very positive, this is a great time to sell.", false, this.sellPrice.value >= 0);
    this.deltaBuyPrice = new Metric("Delta Buy Price", this.buyPrice.value > 0 ? this.buyPrice.value - this.averageBuyPrice.value : 0, "The difference between the current buy price and the average buy price. If this is very negative, this is a great time to buy. If this is very positive, this is a great time to sell.", false, this.buyPrice.value >= 0);
    this.soldAmount = new Metric("Sold", +values[4], "The amount of items sold in the last 30 days.", false, false);
    this.boughtAmount = new Metric("Bought", +values[5], "The amount of items bought in the last 30 days.", false, false);
    this.activeTraders = new Metric("Traders", +values[values.length - 1], "The amount of buy or sell offers in the last 24 hours, whichever one is smaller. I.e. the amount of other flippers you are competing with.", false, false);

    const tax: number = 0.02;
    const maxTax: number = 250000;

    // Calculated data.
    var profit = this.sellPrice.value > 0 && this.buyPrice.value > 0 ? Math.round((this.sellPrice.value - this.buyPrice.value) - Math.min(this.sellPrice.value * tax, maxTax)) : 0;
    this.profit = new Metric("Profit", profit, `The profit you would get for flipping this item right now. Minus ${tax} tax.`);
    var avgProfit = this.averageSellPrice.value > 0 && this.averageBuyPrice.value > 0 ? Math.round((this.averageSellPrice.value - this.averageBuyPrice.value) - Math.min(this.sellPrice.value * tax, maxTax)) : 0;
    this.averageProfit = new Metric("Avg. Profit", avgProfit, `The profit you would get on average for flipping this item. Minus ${tax} tax.`);

    this.potProfit = new Metric("Potential Profit", this.profit.value * Math.min(this.soldAmount.value, this.boughtAmount.value), "The potential profit of the item, if you were the only trader for 1 month.", true);
  }
}

var exampleItem: ItemData = new ItemData("Example", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);

class HistoryData{
  buyOffer: number | null;
  sellOffer: number | null;
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

    this.time = time;
    this.events = events;
  }
}

class WeekdayData{
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

function timestampToEvents(unixTimestamp: number){
  var dateTime: Date = new Date(unixTimestamp * 1000);
  var dateKey = `${dateTime.getUTCFullYear()}.${(dateTime.getUTCMonth() + 1).toString().padStart(2, "0")}.${(dateTime.getUTCDate()).toString().padStart(2, "0")}`;

  return dateKey in events ? events[dateKey] : [];
}

const App: React.FC = () => {
  /**
   * Gets called when the pagination, filter or sorter changes.
   * @param pagination 
   * @param filters 
   * @param sorter 
   */
  function handleTableChanged(pagination: any, filters: any, sorter: any){
    ReactGA.event({
      category: 'Search',
      action: 'Changed page, filter or sorter',
      label: `Page: ${pagination.current}/${pagination.pageSize}, Sorter: ${sorter.field}, Order: ${sorter.order}`
    });
  }

  /**
   * Returns all search filters as a string. Joined by a comma.
   */
  function getCurrentFilterString(){
    return `Name: ${nameFilter}, Min Buy: ${minBuyFilter}, Max Buy: ${maxBuyFilter}, Min Flips: ${minFlipsFilter}, Max Flips: ${maxFlipsFilter}, Min Traders: ${minTradersFilter}, Max Traders: ${maxTradersFilter}`;
  }

  /**
   * Returns the original name of the item, including spaces and capitalisation.
   * @param dataName The name of the item to return the original name for.
   * @returns 
   */
  function dataNameToOriginalName(dataName: string){
    if (dataName.toLowerCase().trim() in itemNames)
      return itemNames[dataName.toLowerCase().trim()];
    else
      return dataName;
  }

  /**
   * Returns the nabbot image url of the item.
   * @param itemName The item name to return the image url for.
   */
  function itemToImage(itemName: string): string{
    var originalItemName: string = dataNameToOriginalName(itemName);
    return `https://static.nabbot.xyz/tibiawiki/item/${originalItemName}.gif`
  }

  function itemToWikiLink(itemName: string){
    return <a href={'https://tibia.fandom.com/wiki/' + itemName} target='_blank'>{itemName}</a>
  }

  function doesDataMatchFilter(dataObject: ItemData){
    // Filter input by user.
    if(nameFilter != "" && !dataObject.name.toLowerCase().includes(nameFilter.toLowerCase())){
      return false;
    } 

    if(maxBuyFilter > 0 && dataObject.buyPrice.value > maxBuyFilter){
      return false;
    }

    if(dataObject.buyPrice.value < minBuyFilter){
      return false;
    }

    if(Math.min(dataObject.soldAmount.value, dataObject.boughtAmount.value) < minFlipsFilter){
      return false;
    }

    if(maxFlipsFilter > 0 && Math.min(dataObject.soldAmount.value, dataObject.boughtAmount.value) > maxFlipsFilter){
      return false;
    }

    if(maxTradersFilter > 0 && dataObject.activeTraders.value > maxTradersFilter){
      return false;
    }

    if(dataObject.activeTraders.value < minTradersFilter){
      return false;
    }

    return true;
  }

  function addDataRow(data: string){
    var columnData: string[] = data.split(",");

    // If there are more than 8 columns in the data, merge the beginning until there are 8 columns.
    while(columnData.length > 8){
      columnData[0] += `,${columnData[1]}`;
      columnData.splice(1, 1);
    }

    var name = dataNameToOriginalName(columnData[0]);
    var dataObject: ItemData = new ItemData(name, columnData.splice(1, columnData.length - 1));

    if(!doesDataMatchFilter(dataObject)) 
      return;

    dataSource.push(dataObject);
  }

  function setDataColumns(exampleItem: ItemData){
    columns = [];

    // Add name column.
    columns.push({
      title: 'Name',
      dataIndex: 'name',
      width: 100,
      fixed: 'left',
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      sortDirections: ['descend', 'ascend', 'descend'],
      render: (text: any, record: any) => {
        return <div>
          <img src={itemToImage(text)}/> <br></br>
          {itemToWikiLink(text)}
          </div>;
      }
    });
    
    // Add all other columns.
    for (const [key, value] of Object.entries(exampleItem)) {
      if(key == "name" || value.isHidden)
        continue;

      columns.push({
        title: <div>{value.name} <AntTooltip title={value.description}><QuestionCircleOutlined /></AntTooltip></div>,
        dataIndex: [key, 'localisedValue'],
        width: 50,
        sorter: (a: any, b: any) => {
          return a[key].value - b[key].value;
        },
        sortDirections: ['descend', 'ascend', 'descend'],
      });
    }

    setColumns([...columns]);
  }

  async function fetchData(){
    setIsLoading(true);

    ReactGA.event({
      category: 'Search',
      action: 'User pressed search button',
      label: getCurrentFilterString()
    });

    // Load tracked item names if not already loaded.
    if(!("sword" in itemNames))
      await fetchItemNamesAsync();

    var market_data_url: string = "https://raw.githubusercontent.com/Marilyth/tibia-market-tracker/data/fullscan.csv"
      
    var items = await fetch(market_data_url).then(response => {
      if(response.status != 200){
          setIsLoading(false);
          throw new Error("Fetching items failed!");
      }

      return response.text();
    });

    var data = items.split("\n");
    var header = data[0];
    dataSource = [];

    for(var i = 1; i < data.length; i++){
      if(data[i].length > 0){
        addDataRow(data[i]);
      }
    }

    setDataColumns(exampleItem);
    setDataSource([...dataSource]);

    await fetchEventHistory();

    setIsLoading(false);
  }

  /**
   * Fetches all tracked item names from tracked_items.txt, and maps their lowercase version to original version
   * in the itemNames dictionary.
   */
  async function fetchItemNamesAsync(){
    var market_data_url: string = "https://raw.githubusercontent.com/Marilyth/tibia-market-tracker/main/items.csv"
        
    var items = await fetch(market_data_url).then(response => {
      if(response.status != 200){
          throw new Error("Fetching tracked items failed!");
      }

      return response.text();
    });

    for(var item of items.split("\n")){
      if(item.length == 0)
        continue;

      var values = item.split(",");
      var id = values[values.length - 1];
      // Take every index of the values array except the last one.
      item = values.slice(0, values.length - 1).join(",");

      itemNames[item.toLowerCase().trim()] = item;
    }
  }

  /// Gets and parses the events.csv file from the data branch, and saves the events in the global events dictionary.
  async function fetchEventHistory(){
    var history_data_url: string = `https://raw.githubusercontent.com/Marilyth/tibia-market-tracker/data/events.csv`;
      
    var eventFile = await fetch(history_data_url).then(response => {
      if(response.status != 200){
          setIsLoading(false);
          throw new Error("Fetching items failed!");
      }

      return response.text();
    });

    var eventEntries = eventFile.split("\n");
    for(var i = 0; i < eventEntries.length; i++){
      if(eventEntries[i].length > 10){
        var eventInfo = eventEntries[i].split(",");
        var date = eventInfo[0];
        var eventNames = eventInfo.slice(1);
        events[date] = eventNames;
      }
    }
  }

  async function fetchPriceHistory(itemName: string){
    ReactGA.event({
      category: 'Search',
      action: 'User requested history for item',
      label: itemName
    });

    var history_data_url: string = `https://raw.githubusercontent.com/Marilyth/tibia-market-tracker/data/histories/${encodeURIComponent(itemName.toLowerCase())}.csv`;
      
    var items = await fetch(history_data_url).then(response => {
      if(response.status != 200){
          setIsLoading(false);
          throw new Error("Fetching items failed!");
      }

      return response.text();
    });

    var graphData: HistoryData[] = []
    var weekdayData: WeekdayData[] = []
    for(var i = 0; i < 7; i++){
      weekdayData.push(new WeekdayData(i));
    }

    var data = items.split("\n");
    for(var i = 0; i < data.length; i++){
      var values = data[i].split(",");

      if(values.length > 1){
        var historyData = new HistoryData(+values[1], +values[0], +values[3], +values[2], +values[4], +values[values.length - 1], timestampToEvents(+values[values.length - 1]));
        graphData.push(historyData);
        
        // Subtract 9 hours to make days start at server-save. (technically 8 hours CET, 9 hours CEST, but this is easier)
        var date: number = new Date((historyData.time - 32400) * 1000).getUTCDay();
        weekdayData[date].addOffer(historyData.buyOffer ?? 0, historyData.sellOffer ?? 0);
      }
    }

    for(var i = 0; i < weekdayData.length; i++){
      weekdayData[i].calculateMedian();
    }

    setModalPriceHistory(graphData);
    setmodalWeekdayHistory(weekdayData);
  }

  const { defaultAlgorithm, darkAlgorithm } = theme;
  var [isLightMode, setIsLightMode] = useState(localStorage.getItem("isLightModeKey") != "false");
  useEffect(() => {
    localStorage.setItem("isLightModeKey", isLightMode.toString());
  }, [isLightMode]);

  var [dataSource, setDataSource] = useState<ItemData[]>([]);
  var [isLoading, setIsLoading] = useState(false);
  var [columns, setColumns] = useState<ColumnType<ItemData>[]>([]);
  var [nameFilter, setNameFilter] = useState("");
  var [minBuyFilter, setMinBuyFilter] = useState(0);
  var [maxBuyFilter, setMaxBuyFilter] = useState(0);
  var [minFlipsFilter, setMinTradesFilter] = useState(0);
  var [maxFlipsFilter, setMaxTradesFilter] = useState(0);
  var [minTradersFilter, setMinOffersFilter] = useState(0);
  var [maxTradersFilter, setMaxOffersFilter] = useState(0);
  var [selectedItem, setSelectedItem] = useState("");
  var [modalPriceHistory, setModalPriceHistory] = useState<HistoryData[]>([]);
  var [modalWeekdayHistory, setmodalWeekdayHistory] = useState<WeekdayData[]>([]);
  var [isModalOpen, setIsModalOpen] = useState(false);

  var weekdayDateOptions: Intl.DateTimeFormatOptions = {hour12: true, weekday: "short", year: "numeric", month: "short", day: "numeric", hour: '2-digit', minute:'2-digit'};
  var dateOptions: Intl.DateTimeFormatOptions = {hour12: true, year: "numeric", month: "short", day: "numeric"}

  useEffect(() => {
    const yourFunction = async () => {
      await fetchData();
    };
    yourFunction();
  }, []);

  return (
  <ConfigProvider
    theme={{
      algorithm: isLightMode ? defaultAlgorithm : darkAlgorithm,
  }}>
    <Layout hasSider style={{height:'100vh'}}>
      <Sider
        style={{
          overflow: 'auto',
          padding: 10,
          borderRight: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
        }}
        trigger={null}
        theme='light'
      >
        <div id='title' style={{borderBottom: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)'}}>
          <Title level={4} style={{textAlign:'center'}}>
            Market Tracker
          </Title>
        </div>
        <Title level={5} style={{textAlign:'center', color:'grey'}}>
          Filters
        </Title>
        
        <Form layout='vertical'>
          <Form.Item name="Name">
            <Input placeholder='Name' onChange={(e) => setNameFilter(e.target.value)}></Input>
          </Form.Item>
          <Form.Item name="Buy limits">
            <InputNumber placeholder='Minimum buy price' onChange={(e) => setMinBuyFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
            <InputNumber placeholder='Maximum buy price' onChange={(e) => setMaxBuyFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
          </Form.Item>
          <Form.Item name="Flips">
            <InputNumber placeholder='Minimum flips' onChange={(e) => setMinTradesFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
            <InputNumber placeholder='Maximum flips' onChange={(e) => setMaxTradesFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
          </Form.Item>
          <Form.Item name="Traders">
            <InputNumber placeholder='Minimum traders' onChange={(e) => setMinOffersFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
            <InputNumber placeholder='Maximum traders' onChange={(e) => setMaxOffersFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
          </Form.Item>
          <Form.Item>
            <Button htmlType="submit" id='search-button' onClick={fetchData} loading={isLoading}>
              Search
            </Button>
          </Form.Item>
          <Form.Item label="Appearance">
            <Switch checkedChildren="Light" unCheckedChildren="Dark" defaultChecked={isLightMode} onChange={setIsLightMode}></Switch>
          </Form.Item>
        </Form>
      </Sider>
      <Layout className="site-layout" style={{ width: '100%' }}>
        <Content style={{ margin: '24px 16px 0', overflow: 'auto' }}>
          <Modal
            title=<div>Item history for {itemToWikiLink(selectedItem)}</div>
            centered
            open={isModalOpen}
            onOk={() => setIsModalOpen(false)}
            onCancel={() => setIsModalOpen(false)}
            width='50%'
          >
            <Collapse defaultActiveKey={1}>
            <Panel header="Buy and Sell price over time" key="1">
              <ResponsiveContainer width='100%' height={200}>
              <LineChart data={modalPriceHistory}>
                <XAxis domain={["dataMin", "dataMax + 1"]} type='number' dataKey="time" tickFormatter={(date) => new Date(date * 1000).toLocaleString('en-GB', dateOptions)}/>
                <YAxis />
                <CartesianGrid stroke="#eee" strokeDasharray="5 5"/>
                <Tooltip contentStyle={{backgroundColor: isLightMode ? "#FFFFFFBB" : "#141414BB"}} labelFormatter={(date) => <div>
                                                        {new Date(date * 1000).toLocaleString('en-GB', weekdayDateOptions)}
                                                        <p style={{ color: "#ffb347"}}>{timestampToEvents(date).join(", ")}</p>
                                                   </div>} formatter={(x) => x.toLocaleString()}></Tooltip>
                <Line connectNulls type='monotone' dataKey="buyOffer" stroke="#8884d8" dot={false} />
                <Line connectNulls type='monotone' dataKey="sellOffer" stroke="#82ca9d" dot={false} />
                <Brush fill={isLightMode ? "#FFFFFF" : "#141414"} dataKey="time" tickFormatter={(date) => new Date(date * 1000).toLocaleString('en-GB', dateOptions)}></Brush>
              </LineChart>
            </ResponsiveContainer>
            </Panel>
            <Panel header="Bought and Sold amount over time" key="2">
            <Alert message="These are the cummulative amount of bought and sold items within a 1 month window." showIcon type="info" closable />
              <ResponsiveContainer width='100%' height={200}>
                <LineChart data={modalPriceHistory}>
                  <XAxis domain={["dataMin", "dataMax + 1"]} type='number' dataKey="time" tickFormatter={(date) => new Date(date * 1000).toLocaleString('en-GB', dateOptions)}/>
                  <YAxis />
                  <CartesianGrid stroke="#eee" strokeDasharray="5 5"/>
                  <Tooltip contentStyle={{backgroundColor: isLightMode ? "#FFFFFFBB" : "#141414BB"}} labelFormatter={(date) => <div>
                                                          {new Date(date * 1000).toLocaleString('en-GB', weekdayDateOptions)}
                                                          <p style={{ color: "#ffb347"}}>{timestampToEvents(date).join(", ")}</p>
                                                    </div>} formatter={(x) => x.toLocaleString()}></Tooltip>
                  <Line connectNulls type='monotone' dataKey="buyAmount" stroke="#8884d8" dot={false} />
                  <Line connectNulls type='monotone' dataKey="sellAmount" stroke="#82ca9d" dot={false} />
                  <Brush fill={isLightMode ? "#FFFFFF" : "#141414"} dataKey="time" tickFormatter={(date) => new Date(date * 1000).toLocaleString('en-GB', dateOptions)}></Brush>
                </LineChart>
              </ResponsiveContainer>
            </Panel>
            <Panel header="Active Traders over time" key="3">
            <Alert message="This is the amount of new buy or sell offers within a 24 hour period, whichever one is smaller. I.e. the amount of other flippers." showIcon type="info" closable />
              <ResponsiveContainer width='100%' height={200}>
                <LineChart data={modalPriceHistory}>
                  <XAxis domain={["dataMin", "dataMax + 1"]} type='number' dataKey="time" tickFormatter={(date) => new Date(date * 1000).toLocaleString('en-GB', dateOptions)}/>
                  <YAxis />
                  <CartesianGrid stroke="#eee" strokeDasharray="5 5"/>
                  <Tooltip contentStyle={{backgroundColor: isLightMode ? "#FFFFFFBB" : "#141414BB"}} labelFormatter={(date) => <div>
                                                          {new Date(date * 1000).toLocaleString('en-GB', weekdayDateOptions)}
                                                          <p style={{ color: "#ffb347"}}>{timestampToEvents(date).join(", ")}</p>
                                                    </div>} formatter={(x) => x.toLocaleString()}></Tooltip>
                  <Line connectNulls type='monotone' dataKey="activeTraders" stroke="#d884d8" dot={false} />
                  <Brush fill={isLightMode ? "#FFFFFF" : "#141414"} dataKey="time" tickFormatter={(date) => new Date(date * 1000).toLocaleString('en-GB', dateOptions)}></Brush>
                </LineChart>
              </ResponsiveContainer>
            </Panel>
            <Panel header="Median Buy and Sell price per weekday" key="4">
              <ResponsiveContainer width='100%' height={200}>
              <BarChart data={modalWeekdayHistory}>
                <XAxis dataKey="weekday" tickFormatter={(day) => WeekdayData.weekdays[day]}/>
                <YAxis />
                <Bar dataKey="medianSellOffer" barSize={30} fill="#82ca9d"/>
                <Bar dataKey="medianBuyOffer" barSize={30} fill="#8884d8"/>
                <Tooltip contentStyle={{backgroundColor: isLightMode ? "#FFFFFFBB" : "#141414BB"}} cursor={{fill: '#00000011'}} labelFormatter={(day) => WeekdayData.weekdays[day]} formatter={(x) => x.toLocaleString()}></Tooltip>
              </BarChart>
            </ResponsiveContainer>
            </Panel>
            </Collapse>
          </Modal>
          <Alert message="Some values can be false! If they seem unreal, they probably are." showIcon type="warning" closable />
          <Alert message="You can see the price history of an item by clicking on its row!" showIcon type="info" closable />
          <Table id='items-table' dataSource={dataSource} columns={columns} loading={isLoading} onRow={(record, rowIndex) => {
              return {
                onClick: (event) => {setSelectedItem(record.name); fetchPriceHistory(record.name); setIsModalOpen(true);}
              };
            }} onChange={handleTableChanged}>
        </Table>
        </Content>
      </Layout>
    </Layout>
  </ConfigProvider>
  );
};

export default App;
