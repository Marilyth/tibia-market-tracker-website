import React, { useEffect, useState }  from 'react';
import type { MenuProps } from 'antd';
import { Layout, Drawer, Radio, RadioProps, RadioGroupProps, DrawerProps, FloatButton, FloatButtonProps, Collapse, Tooltip as AntTooltip, message, Menu, theme, Select, Button, Input, ConfigProvider, InputNumber, Space, Switch, Table, Typography, Pagination, Image, Modal, Alert, AlertProps, Form, SelectProps, Spin, Divider } from 'antd';
import { QuestionCircleOutlined, LineChartOutlined, FilterOutlined, BulbFilled, BulbOutlined, OrderedListOutlined, MenuOutlined, CodeOutlined, CloudDownloadOutlined, GithubOutlined, QuestionCircleFilled, QuestionCircleTwoTone, InfoCircleOutlined } from '@ant-design/icons';
import {LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ResponsiveContainer, Tooltip, Brush } from 'recharts';
import './App.css';
import { ColumnType } from 'antd/es/table';
import { timestampToEvents, ItemData, Metric, TextMetric, exampleItem, NPCSaleData, ItemMetaData, WorldData, CustomTimeGraph, CustomHistoryData, newLineToBreaks } from './utils/data';
import { linearRegressionLeastSquares } from './utils/math'
import { CustomTooltip, DynamicChart } from './utils/CustomToolTip';
import { Timestamp, unixTimeToTimeAgo } from './utils/Timestamp';
import { DefaultOptionType } from 'antd/es/select';
import { FaDiscord, FaGithub } from "react-icons/fa";

const { Header, Content, Footer, Sider } = Layout;
const { Title, Text } = Typography;
const { Panel } = Collapse;

var events: { [date: string]: string[]} = {}
var cachedMarketResponses: {[server: string]: {timestamp: number, response: string}} = {};
var cachedTibiaCoinHistoryResponses: {[server: string]: {timestamp: number, response: string}} = {};
var itemMetaData: {[id: number]: ItemMetaData} = {};
var worldData: WorldData[] = [];
var worldDataDict: {[name: string]: WorldData} = {};
var urlParams = new URLSearchParams(window.location.search);
var lastApiRequests: { [endpoint: string]: number } = {};
var requestLocks: { [endpoint: string]: boolean } = {};

const App: React.FC = () => {
  /**
   * Send a request to the api to fetch data. Automatically handles errors.
   * @param endpoint The endpoint to fetch data from.
   */
  async function getDataAsync(endpoint: string, ratelimit: number = 5000){
    var endpointName = endpoint.split("?")[0];
    var timeLeft = endpointName in lastApiRequests ? lastApiRequests[endpointName] + (ratelimit - new Date().getTime()) : 0;

    // Wait for the ratelimit to pass instead of erroring.
    if (timeLeft > 0){
      messageApi.info(`Waiting ${(timeLeft / 1000).toFixed(2)}s before fetching to avoid ratelimit...`, 10);
      await new Promise(r => setTimeout(r, timeLeft));
    }

    var items = await fetch(`https://api.tibiamarket.top:8001/${endpoint}`, {headers: {"Authorization": `Bearer ${apiKey}`}}).then(async response => {
      if(response.status != 200){
          var errorMessage = `${response.statusText}. ${await response.text()}`;
          throw new Error(errorMessage);
      }
  
      return response.text();
    }).catch((error) => {
      messageApi.error(`Fetching ${endpointName} failed, please try again in a bit!`, 10);
      messageApi.error(error.message, 10);
      setIsLoading(false);
  
      throw new Error("Fetching tracked items failed!");
    });

    lastApiRequests[endpointName] = new Date().getTime();
    return items;
  }

  var lastSorter: string = "";

  /**
   * Gets called when the pagination, filter or sorter changes.
   * @param pagination 
   * @param filters 
   * @param sorter 
   */
  function handleTableChanged(pagination: any, filters: any, sorter: any){
    if (sorter && JSON.stringify(sorter) != lastSorter){
      addStatistic("sorted", sorter["field"][0]);
      lastSorter = JSON.stringify(sorter);
    }
  }

  /**
   * Gets the value of a parameter from the url, localstorage, or the default value if the parameter is not set.
   * @param paramName The name of the parameter to get the value for.
   * @param defaultValue The default value to return if the parameter is not set.
   * @returns The value of the parameter, or the default value if the parameter is not set.
   */
  function getLocalParamValue(paramName: string, defaultValue: any){
    var paramValue = urlParams.get(paramName);
    if(paramValue == null){
      var localValue = localStorage.getItem(`${paramName}Key`);

      if(localValue == null){
        return defaultValue;
      }

      return localValue;
    }

    return paramValue;
  }

  /**
   * Sets the value of a parameter in the url and localstorage.
   * @param paramName The name of the parameter to set the value for.
   * @param paramValue The value to set the parameter to.
   */
  function setLocalParamValue(paramName: string, paramValue: any, hideFromUrl: boolean){
    if(!hideFromUrl){
      urlParams.set(paramName, paramValue);
      // TODO: Make this work without refresh.
      //window.location.search = urlParams.toString();
    }

    localStorage.setItem(`${paramName}Key`, paramValue);
  }

  /**
   * Returns all search filters as a string. Joined by a comma.
   */
  function getCurrentFilterString(){
    return `Name: ${nameFilter}, Min Buy: ${minBuyFilter}, Max Buy: ${maxBuyFilter}, Min Flips: ${minFlipsFilter}, Max Flips: ${maxFlipsFilter}, Min Traders: ${minTradersFilter}, Max Traders: ${maxTradersFilter}`;
  }

  function nameToWikiLink(itemName: string){
    return <a href={'https://tibia.fandom.com/wiki/' + itemName} target='_blank'>{itemName}</a>
  }

  function doesDataMatchFilter(dataObject: ItemData){
    // Filter input by user.
    if(nameFilter.length > 0){
      var itemName = dataObject.name.toLowerCase();
      var containsAny = false;

      for(var name of nameFilter){
        if(itemName.includes(name.toLowerCase().trim())){
          containsAny = true;
          break;
        }
      }

      if(!containsAny){
        return false;
      }
    } 

    if(maxBuyFilter > 0 && dataObject.buy_offer.value > maxBuyFilter){
      return false;
    }

    if(minBuyFilter > -1 && dataObject.buy_offer.value < minBuyFilter){
      return false;
    }

    if(Math.min(dataObject.month_sold.value, dataObject.month_bought.value) < minFlipsFilter){
      return false;
    }

    if(maxFlipsFilter > 0 && Math.min(dataObject.month_sold.value, dataObject.month_bought.value) > maxFlipsFilter){
      return false;
    }

    if(maxTradersFilter > 0 && dataObject.active_traders.value > maxTradersFilter){
      return false;
    }

    if(dataObject.active_traders.value < minTradersFilter){
      return false;
    }

    return true;
  }

  function addDataRow(data: any, tibiaCoinData: any){
    var metaData = itemMetaData[data.id];

    var dataObject: ItemData = new ItemData(data, metaData, tibiaCoinData);

    if(!doesDataMatchFilter(dataObject)){
      return;
    }

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
          <Space>
            <img src={`/sprites/${record.id.value}.gif`}/>
            {nameToWikiLink(text)}
          </Space>
        </div>;
      }
    });
    
    // Add all other columns.
    for (const [key, value] of Object.entries(exampleItem)) {
      if(key == "name" || value.isHidden || !marketColumns.includes(key))
        continue;

      columns.push({
        title: value.name,
        dataIndex: [key, 'localisedValue'],
        width: 50,
        sorter: (a: any, b: any) => {
          if (typeof a[key].value == "number")
            return a[key].value - b[key].value;
          else
            return a[key].value.localeCompare(b[key].value);
        },
        sortDirections: ['descend', 'ascend', 'descend'],
        render: (text: any, record: any) => {
          // Find out of the key's value of this record has additionalInfo.
          return <Space>
            {
            record[key].additionalInfo.length > 0 ? 
              <AntTooltip style={{ marginLeft: '200px'}} title={newLineToBreaks(record[key].additionalInfo)}>{text}</AntTooltip> : 
              text
            }
            {record[key].icon != "" ? <img src={record[key].icon} style={{height: '20px'}}/> : ""}
          </Space>
        }
      });
    }

    // Add actions column.
    columns.push({
      title: '',
      key: 'actions',
      width: "1%",
      render: (text: any, record: any) => {
        return <Space>
            <AntTooltip title="View the price history for this item">
              <Button icon={<LineChartOutlined />} onClick={async () => {setSelectedItem(record.name); await fetchPriceHistory(record.id.value, historyDays); setIsModalOpen(true);}}></Button>
            </AntTooltip>
            <AntTooltip title="View on TibiaWiki">
              <Button onClick={() => window.open(`https://tibia.fandom.com/wiki/${record.name}`, '_blank')}><img src="/Heavily_Bound_Book.gif" style={{height: '20px', marginLeft: '-8px', marginRight: '-8px' }}/></Button>
            </AntTooltip>
          </Space>
      }
    });

    setColumns([...columns]);
  }

  async function addStatistic(identifier: string, value: string){
    var subIdentifier = marketServer;
    await getDataAsync(`add_statistic?identifier=${identifier}&sub_identifier=${subIdentifier}&value=${value}`, 0);
  }

  async function fetchData(){
    if (isLoading)
      return;

    setIsLoading(true);
    setLastUpdated(0);

    // Load events if not already loaded.
    await fetchEventHistory();

    // Check if marketServer is in cachedMarketResponse.
    if (!(marketServer in cachedMarketResponses) || cachedMarketResponses[marketServer].timestamp < new Date(worldDataDict[marketServer].last_update + "Z").getTime()){
      var items = await getDataAsync(`market_values?limit=5000&server=${marketServer}&statistics=${marketColumns.join(",")}`);
      cachedMarketResponses[marketServer] = {"timestamp": new Date().getTime(), "response": items};
    }
    
    await addStatistic("market_values_website", JSON.stringify(nameFilter));

    var marketValues = JSON.parse(cachedMarketResponses[marketServer].response);
    dataSource = [];

    var tibiaCoinData = isTibiaCoinPriceVisible ? marketValues.find((x: any) => x.id == 22118) : null;

    for(var i = 0; i < marketValues.length; i++){
      addDataRow(marketValues[i], tibiaCoinData);
    }

    setDataColumns(exampleItem);
    setDataSource([...dataSource]);

    // If data has values, set the last updated timestamp to the maximum timestamp of the data.
    if(marketValues.length > 0){
      setLastUpdated(Math.max(...marketValues.map((x: any) => x.time)));
    }

    setIsLoading(false);
    setIsDrawerOpen(false);
  }

  /**
   * Fetches all tracked item names from tracked_items.txt, and maps their lowercase version to original version
   * in the itemNames dictionary.
   */
  async function fetchMetaDataAsync(){
    // Load metadata if it isn't already loaded.
    if(Object.keys(itemMetaData).length == 0){
      var items = await getDataAsync("item_metadata");
      var metaDatas: [ItemMetaData] = JSON.parse(items);

      var itemOptions = [];

      for(var item of metaDatas.sort((a, b) => a.name.localeCompare(b.name))){
        itemMetaData[item.id] = item;

        var itemName = item.wiki_name != null ? item.wiki_name : item.name;
        itemOptions.push({label: itemName, value: itemName, key: item.id});
      }

      setMarketItemOptions(itemOptions);
    }
  }

  /// Gets and parses the events.csv file from the data branch, and saves the events in the global events dictionary.
  async function fetchEventHistory(){
    if(Object.keys(events).length == 0){
      var eventResponse = await getDataAsync("events?start_days_ago=9999", 0);

      var eventValues = JSON.parse(eventResponse);
      var eventEntries = eventValues;
  
      for(var i = 0; i < eventEntries.length; i++){
        var date = eventEntries[i].date;
        var eventNames = eventEntries[i].events;
        events[date] = eventNames;
      }
    }
  }

  async function fetchWorldData(){
    var items = await getDataAsync("world_data", 0);
    await fetchMetaDataAsync();

    worldData = JSON.parse(items);
    worldDataDict = {};
    for(var i = 0; i < worldData.length; i++){
      worldDataDict[worldData[i].name] = worldData[i];
    }

    setMarketServerOptions(worldData.sort((a, b) => a.name.localeCompare(b.name)).map(x => {return {label: `${x.name} (${unixTimeToTimeAgo(new Date(x.last_update + "Z").getTime())})`, value: x.name}}));
  }

  async function fetchPriceHistory(itemId: number, days: number = 30){
    setIsLoading(true);

    var item = await getDataAsync(`item_history?server=${marketServer}&item_id=${itemId}&start_days_ago=${days}&statistics=${marketColumns.join(",")}`);
    var tibiaCoinHistory = null;

    // Check if marketServer is in cachedMarketResponse.
    if (isTibiaCoinPriceVisible){
      if(!(marketServer in cachedTibiaCoinHistoryResponses) || cachedTibiaCoinHistoryResponses[marketServer].timestamp < new Date(worldDataDict[marketServer].last_update + "Z").getTime()){
        var tibiaCoinHistoryResponse = await getDataAsync(`item_history?server=${marketServer}&item_id=22118&start_days_ago=9999&statistics=${marketColumns.join(",")}`);
        cachedTibiaCoinHistoryResponses[marketServer] = {"timestamp": new Date().getTime(), "response": tibiaCoinHistoryResponse};
      }

      tibiaCoinHistory = JSON.parse(cachedTibiaCoinHistoryResponses[marketServer].response);
    }

    var priceGraphData: CustomTimeGraph = new CustomTimeGraph();
    priceGraphData.addDetail("buyOffer", "#8884d8", "Buy offer");
    priceGraphData.addDetail("sellOffer", "#82ca9d", "Sell offer");

    var priceTransactionGraphData: CustomTimeGraph = new CustomTimeGraph();
    priceTransactionGraphData.addDetail("bought", "#8884d8", "Bought");
    priceTransactionGraphData.addDetail("sold", "#82ca9d", "Sold");

    var traderGraphData: CustomTimeGraph = new CustomTimeGraph();
    traderGraphData.addDetail("activeTraders", "#d884d8", "Active traders");

    var weekdayPriceGraph: CustomTimeGraph = new CustomTimeGraph();
    weekdayPriceGraph.addDetail("buyOffer", "#8884d8", "Median buy offer");
    weekdayPriceGraph.addDetail("sellOffer", "#82ca9d", "Median sell offer");
    weekdayPriceGraph.isWeekdayGraph = true;

    var weekdayTransactionGraph: CustomTimeGraph = new CustomTimeGraph();
    weekdayTransactionGraph.addDetail("dayBought", "#8884d8", "Median bought");
    weekdayTransactionGraph.addDetail("daySold", "#82ca9d", "Median sold");
    weekdayTransactionGraph.isWeekdayGraph = true;

    var data = JSON.parse(item);
    var metaData = itemMetaData[itemId];

    var itemData: ItemData[] = [];
    for(var i = 0; i < data.length; i++) {
      var tibiaCoinHistoryIndex = tibiaCoinHistory != null ? Math.max(0, Math.min(tibiaCoinHistory.length - 1, (tibiaCoinHistory.length - data.length) + i)) : -1;
      var tibiaCoinData = tibiaCoinHistory != null ? tibiaCoinHistory[tibiaCoinHistoryIndex] : null;

      var dataObject: ItemData = new ItemData(data[i], metaData, tibiaCoinData);
      itemData.push(dataObject);
    }

    for(var i = 0; i < itemData.length; i++){
      var data_events: string[] = timestampToEvents(data[i].time, events);
      var dataObject = itemData[i];

      // Price is daily average if available, otherwise it's the current price.
      var priceDatapoint = new CustomHistoryData(dataObject.time.value, data_events);
      if (dataObject.day_average_buy.value >= 0 && dataObject.day_average_sell.value >= 0)
      {
        // If nothing was bought/sold on that day, ignore the price.
        priceDatapoint.addData("buyOffer", dataObject.day_average_buy.value > 0 ? dataObject.day_average_buy.value : -1);
        priceDatapoint.addData("sellOffer", dataObject.day_average_sell.value > 0 ? dataObject.day_average_sell.value : -1);
      }
      else
      {
        priceDatapoint.addData("buyOffer", dataObject.buy_offer.value);
        priceDatapoint.addData("sellOffer", dataObject.sell_offer.value);
      }
      
      priceGraphData.addData(priceDatapoint);

      var transactionDatapoint = new CustomHistoryData(dataObject.time.value, data_events);
      transactionDatapoint.addData("bought", dataObject.day_bought.value > -1 ? dataObject.day_bought.value :  ~~(dataObject.month_bought.value / 30));
      transactionDatapoint.addData("sold", dataObject.day_sold.value > -1 ? dataObject.day_sold.value :  ~~(dataObject.month_sold.value / 30));
      priceTransactionGraphData.addData(transactionDatapoint);

      var traderDatapoint = new CustomHistoryData(dataObject.time.value, data_events);
      traderDatapoint.addData("activeTraders", dataObject.active_traders.value);
      traderGraphData.addData(traderDatapoint);

      var medianWeekdayPriceDatapoint = new CustomHistoryData(dataObject.time.value - 86400, data_events);
      medianWeekdayPriceDatapoint.addData("buyOffer", dataObject.day_average_buy.value);
      medianWeekdayPriceDatapoint.addData("sellOffer", dataObject.day_average_sell.value);
      weekdayPriceGraph.addData(medianWeekdayPriceDatapoint);

      // Set this statistic minus 1 day since they are 1 day delayed.
      var medianWeekdayTransactionDatapoint = new CustomHistoryData(dataObject.time.value - 86400, data_events);
      medianWeekdayTransactionDatapoint.addData("dayBought", dataObject.day_bought.value);
      medianWeekdayTransactionDatapoint.addData("daySold", dataObject.day_sold.value);
      weekdayTransactionGraph.addData(medianWeekdayTransactionDatapoint);
    }

    priceGraphData.calculateTrend();
    priceTransactionGraphData.calculateTrend();

    setModalPriceHistory(priceGraphData);
    setModalTraderHistory(traderGraphData);
    setModalTransactionHistory(priceTransactionGraphData);
    setModalMedianWeekdayPriceHistory(weekdayPriceGraph);
    setModalMedianTransactionVolumeHistory(weekdayTransactionGraph);

    setIsLoading(false);
  }

  const [messageApi, contextHolder] = message.useMessage(); 
  const { defaultAlgorithm, darkAlgorithm } = theme;
  var [isLightMode, setIsLightMode] = useState(getLocalParamValue("isLightMode", "false") != "false");
  useEffect(() => {
    setLocalParamValue("isLightMode", isLightMode.toString(), false);
  }, [isLightMode]);

  var [marketServer, setMarketServer] = useState(getLocalParamValue("marketServer", "Antica"));
  useEffect(() => {
    setLocalParamValue("marketServer", marketServer, false);
  }, [marketServer]);

  var [marketColumns, setMarketColumns] = useState(JSON.parse(getLocalParamValue("selectedMarketValueColumns", JSON.stringify(["sell_offer", "buy_offer"]))));
  useEffect(() => {
    setDataColumns(exampleItem);

    if (getLocalParamValue("selectedMarketValueColumns", JSON.stringify(["sell_offer", "buy_offer"])) != JSON.stringify(marketColumns)){
      addStatistic("market_columns", marketColumns.join(","));
    }

    setLocalParamValue("selectedMarketValueColumns", JSON.stringify(marketColumns), true);
  }, [marketColumns]);

  var [nameFilter, setNameFilter] = useState<string[]>(JSON.parse(getLocalParamValue("nameFilter", "[]")));
  useEffect(() => {
    setLocalParamValue("nameFilter", JSON.stringify(nameFilter), true);
  }, [nameFilter]);

  var [apiKey, setApiKey] = useState(getLocalParamValue("apiAccessToken", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ3ZWJzaXRlIiwiaWF0IjoxNzA2Mzc2MTM1LCJleHAiOjI0ODM5NzYxMzV9.MrRgQJyNb5rlNmdsD3oyzG3ZugVeeeF8uFNElfWUOyI"));
  useEffect(() => {
    setLocalParamValue("apiAccessToken", apiKey, true);
  }, [apiKey]);
  
  var [marketServerOptions, setMarketServerOptions] = useState<SelectProps[]>();
  var [marketItemOptions, setMarketItemOptions] = useState<SelectProps[]>();

  // Make all columns optional.
  var marketColumnOptions: any[] = [];
  for (const [key, value] of Object.entries(exampleItem)) {
    if(key == "name")
      continue;

    var category = marketColumnOptions.find(x => x.label == value.category);

    // Add the value.category to the column options if it doesn't exist yet.
    if(category == null){
      category = {label: value.category, options: []};
      marketColumnOptions.push(category);
    }

    category.options.push({
      value: key,
      label: <div>{value.name} <AntTooltip title={value.description}><QuestionCircleOutlined /></AntTooltip></div>,
    });
  }

  var [dataSource, setDataSource] = useState<ItemData[]>([]);
  var [isLoading, setIsLoading] = useState(false);
  var [columns, setColumns] = useState<ColumnType<ItemData>[]>([]);
  var [minBuyFilter, setMinBuyFilter] = useState(-1);
  var [maxBuyFilter, setMaxBuyFilter] = useState(0);
  var [minFlipsFilter, setMinTradesFilter] = useState(-1);
  var [maxFlipsFilter, setMaxTradesFilter] = useState(0);
  var [minTradersFilter, setMinOffersFilter] = useState(-1);
  var [maxTradersFilter, setMaxOffersFilter] = useState(0);
  var [selectedItem, setSelectedItem] = useState("");
  var [historyDays, setHistoryDays] = useState(30);
  var [modalPriceHistory, setModalPriceHistory] = useState<CustomTimeGraph>();
  var [modalTraderHistory, setModalTraderHistory] = useState<CustomTimeGraph>();
  var [modalTransationHistory, setModalTransactionHistory] = useState<CustomTimeGraph>();
  var [modalMedianWeekdayPriceHistory, setModalMedianWeekdayPriceHistory] = useState<CustomTimeGraph>();
  var [modalMedianTransactionVolumeHistory, setModalMedianTransactionVolumeHistory] = useState<CustomTimeGraph>();
  var [isModalOpen, setIsModalOpen] = useState(false);
  var [passwordVisible, setPasswordVisible] = useState(false);
  var [lastUpdated, setLastUpdated] = useState(0);
  var [isTibiaCoinPriceVisible, setIsTibiaCoinPriceVisible] = useState(false);
  var [isDrawerOpen, setIsDrawerOpen] = useState(true);
  useEffect(() => {
    if(isDrawerOpen){
      fetchWorldData();
    }
  }, [isDrawerOpen]);

  var weekdayDateOptions: Intl.DateTimeFormatOptions = {hour12: true, weekday: "short", year: "numeric", month: "short", day: "numeric", hour: '2-digit', minute:'2-digit'};
  var dateOptions: Intl.DateTimeFormatOptions = {hour12: true, year: "numeric", month: "short", day: "numeric"}
  var historyDayOptions: any[] = [{label: "7 days", value: 7}, {label: "1 month", value: 30}, {label: "6 months", value: 180}, {label: "1 year", value: 365}, {label: "All", value: 9999}];

  return (
  <ConfigProvider
    theme={{
      token: {
        colorBgLayout: isLightMode ? undefined : "#101010",
      },

      algorithm: isLightMode ? defaultAlgorithm : darkAlgorithm,
  }}>
    {contextHolder}
    <Layout hasSider style={{height:'100vh'}}>
      <Drawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        placement='left'
        closable={false}
        style={{
          overflow: 'auto',
          padding: 10,
          borderRight: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
        }}
      >
          <Title level={4} style={{textAlign:'center', marginTop: '0px'}}>
            Market Tracker
          </Title>
          <Divider>
          </Divider>
        <Form layout='vertical'>
          <Form.Item label="World" required tooltip="The world for which the market values are fetched">
            <Select options={marketServerOptions} defaultValue={marketServer} onChange={(value) => setMarketServer(value)}></Select>
          </Form.Item>
          <Form.Item label="Items" tooltip="The items which will be shown in the table. This is optional. Leaving this empty will show all items">
            <Select mode='tags' defaultValue={nameFilter} onChange={setNameFilter} tokenSeparators={[",", ";", "."]} placeholder="Item name(s)" options={marketItemOptions} allowClear optionRender={(option) => 
              <Space>
                <img width="20px" src={`/sprites/${option.data.key}.gif`} />
                <Text>{option.data.label}</Text>
              </Space>
            }></Select>
          </Form.Item>
          <Form.Item label="Market values" tooltip="The market values, in addition to the item name, that will be shown in the table after fetching">
            <Select
              mode="multiple"
              allowClear
              placeholder="Select the table columns you want to see"
              defaultValue={marketColumns}
              onChange={setMarketColumns}
              options={marketColumnOptions}
            />
          </Form.Item>
          <Form.Item label="Buy price" tooltip="The current buy price of the item">
            <Space>
              <InputNumber placeholder='Minimum' onChange={(e) => setMinBuyFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
              -
              <InputNumber placeholder='Maximum' onChange={(e) => setMaxBuyFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
            </Space>
          </Form.Item>
          <Form.Item label="Flips" tooltip="The amount of times the item can be flipped (bought and sold) per month">
            <Space>
              <InputNumber placeholder='Minimum' onChange={(e) => setMinTradesFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
              -
              <InputNumber placeholder='Maximum' onChange={(e) => setMaxTradesFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
            </Space>
          </Form.Item>
          <Form.Item label="Traders" tooltip="The amount of buy or sell offers within the past 24 hours, whichever one is smaller. I.e. your competition">
            <Space>
              <InputNumber placeholder='Minimum' onChange={(e) => setMinOffersFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
              -
              <InputNumber placeholder='Maximum' onChange={(e) => setMaxOffersFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
            </Space>
          </Form.Item>
          <Form.Item label="Prices shown as">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
              <img src={"/Gold_Coins.png"} alt="Gold" style={{ height: '24px' }} />
            </div>
            <Switch
              checked={isTibiaCoinPriceVisible}
              checkedChildren="Avg. Tibia Coins"
              unCheckedChildren="Gold"
              style={{ margin: '8px'}}
              onChange={(checked) => setIsTibiaCoinPriceVisible(checked)}
            />
            <div>
              <img src={"/Tibia_Coins.gif"} alt="Avg. Tibia Coins" style={{ height: '24px' }} />
            </div>
          </div>
          </Form.Item>
          {/*<Form.Item>
            <Input.Password placeholder="Access token" defaultValue={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </Form.Item>*/}
          <Form.Item>
            <Button htmlType="submit" id='search-button' onClick={fetchData} loading={isLoading}>
              Search
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
      <Layout className="site-layout" style={{ width: '100%' }}>
        <Header style={{ backgroundColor: isLightMode ? "#ffffff" : "#101010", borderBottom: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Button icon={<MenuOutlined />} onClick={() => setIsDrawerOpen(true)} style={{ position: 'fixed', left: '16px' }} />
          <Button icon={<BulbOutlined />} onClick={() => setIsLightMode(!isLightMode)} style={{ position: 'fixed', right: '16px' }} />
          <a href="https://api.tibiamarket.top:8001/docs" target="_blank" style={{ position: 'fixed', right: '52px' }}>
            <Button icon={<CloudDownloadOutlined />}>
             API
            </Button>
          </a>
          <a href="https://github.com/Marilyth/tibia-market-tracker-website/wiki/Use-the-Tibia-Market-Tracker" target="_blank" style={{ position: 'fixed', right: '132px' }}>
            <Button icon={<QuestionCircleOutlined />}>
             Guide
            </Button>
          </a>
          {window.innerWidth > 650 ? 
          <Typography.Title level={3} style={{ margin: 0 }}>
            Market Tracker
          </Typography.Title> : ""}
        </Header>

        <Content style={{ margin: '0px 16px 0px', overflow: 'auto' }}>
          <Modal
            title=<div>
            Item history for {nameToWikiLink(selectedItem)} 
            <Radio.Group options={historyDayOptions} value={historyDays} optionType="button" disabled={isLoading} style={{marginLeft: "16px"}} onChange={(e) => {setHistoryDays(e.target.value); fetchPriceHistory(dataSource.find(x => x.name == selectedItem)!.id.value, e.target.value)}}></Radio.Group>
            </div>
            centered
            open={isModalOpen}
            onOk={() => setIsModalOpen(false)}
            onCancel={() => setIsModalOpen(false)}
            style={{ minWidth: '80vw' }}
          >
            <Spin spinning={isLoading}>
              <Collapse defaultActiveKey={1}>
                <Panel header="Average daily price over time" key="1">
                  <DynamicChart timeGraph={modalPriceHistory!} isLightMode={isLightMode}></DynamicChart>
                </Panel>
                <Panel header="Transactions over time" key="2">
                  <DynamicChart timeGraph={modalTransationHistory!} isLightMode={isLightMode}></DynamicChart>
                </Panel>
                <Panel header="Median price per weekday" key="3">
                  <DynamicChart timeGraph={modalMedianWeekdayPriceHistory!} isLightMode={isLightMode}></DynamicChart>
                </Panel>
                <Panel header="Median transactions per weekday" key="4">
                  <DynamicChart timeGraph={modalMedianTransactionVolumeHistory!} isLightMode={isLightMode}></DynamicChart>
                </Panel>
              </Collapse>
            </Spin>
          </Modal>
          
          <Table id='items-table' dataSource={dataSource} columns={columns} loading={isLoading} onChange={handleTableChanged} style={{ marginTop: '1%' }}>
        </Table>
        </Content>
        
        <Footer style={{
          borderTop: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center',
        }}>
          ❤️ Please consider donating a few TC or gold to <a href="https://www.tibia.com/community/?name=leenia">Leenia</a> on Antica to help out! ❤️<br></br>
          <a href="https://discord.gg/Rvc8mXtmZH" target="_blank"><FaDiscord color="#505050" size={42} style={{marginTop: 16, marginRight: 16}}/></a> 
          <a href="https://github.com/Marilyth/tibia-market-tracker-website/issues" target="_blank" ><FaGithub color="#505050" size={42} /></a>
        </Footer>
      </Layout>
    </Layout>
  </ConfigProvider>
  );
};

export default App;
