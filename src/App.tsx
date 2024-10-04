import React, { useEffect, useState }  from 'react';
import type { MenuProps } from 'antd';
import { Layout, Drawer, Radio, RadioProps, RadioGroupProps, DrawerProps, FloatButton, FloatButtonProps, Collapse, Tooltip as AntTooltip, message, Menu, theme, Select, Button, Input, ConfigProvider, InputNumber, Space, Switch, Table, Typography, Pagination, Image, Modal, Alert, AlertProps, Form, SelectProps, Spin, Divider } from 'antd';
import { QuestionCircleOutlined, LineChartOutlined, FilterOutlined, BulbFilled, BulbOutlined, OrderedListOutlined, MenuOutlined, CodeOutlined, CloudDownloadOutlined, GithubOutlined, QuestionCircleFilled, QuestionCircleTwoTone, InfoCircleOutlined, ShareAltOutlined, UnorderedListOutlined, FallOutlined, RiseOutlined, MinusOutlined } from '@ant-design/icons';
import {LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ResponsiveContainer, Tooltip, Brush } from 'recharts';
import './App.css';
import { ColumnType } from 'antd/es/table';
import { timestampToEvents, ItemData, Metric, TextMetric, exampleItem, NPCSaleData, ItemMetaData, WorldData, CustomTimeGraph, CustomHistoryData, newLineToBreaks, MarketboardTraderData, Marketboard, exampleMarketboard, TrendMetric } from './utils/data';
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
export var tibiaDataWorldDataDict: {[name: string]: any} = {};
var itemDataDict: {[id: number]: ItemData} = {};
var urlParams = new URLSearchParams(window.location.search);
var localParameters: Set<string> = new Set();
var lastApiRequests: { [endpoint: string]: number } = {};
var requestLocks: { [endpoint: string]: boolean } = {};
var loadOnRender = false;

const App: React.FC = () => {
  /**
   * Fetches and sets the meta information for each world.
   */
  async function getTibiaDataWorldDataAsync(){
    var worlds = await fetch(`https://api.tibiadata.com/v4/worlds`).then(async response => {
      if(response.status != 200){
          var errorMessage = `${response.statusText}. ${await response.text()}`;
          throw new Error(errorMessage);
      }
  
      return response.text();
    }).catch((error) => {
      messageApi.error(`Fetching tibiadata.com failed, please try again in a bit!`, 10);
      messageApi.error(error.message, 10);
      setIsLoading(false);
  
      throw new Error("Fetching tracked items failed!");
    });

    // Parse and add the world data.
    for (var world of JSON.parse(worlds).worlds.regular_worlds){
      tibiaDataWorldDataDict[world.name] = world;
    }
  }

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
      var sorterField = typeof sorter["field"] === 'string' ? sorter["field"] : sorter["field"][0];

      addStatistic("sorted", sorterField);
      lastSorter = JSON.stringify(sorter);

      setSortedByColumn(sorterField);
      setSortedByOrder(sorter["order"]);

      // Make all other columns unsorted.
      for (var column of columns){
        var dataIndex: any = column["dataIndex"];
        var isString = typeof dataIndex === 'string';
        
        if (dataIndex == undefined)
          continue;

        if ((isString && dataIndex != sorterField) || (!isString && dataIndex[0] != sorterField)){
          column["sortOrder"] = null;
        } else {
          column["sortOrder"] = sorter["order"];
        }
      }
    }
  }

  /**
   * Gets the value of a parameter from the url, localstorage, or the default value if the parameter is not set.
   * @param paramName The name of the parameter to get the value for.
   * @param defaultValue The default value to return if the parameter is not set.
   * @returns The value of the parameter, or the default value if the parameter is not set.
   */
  function getLocalParamValue(paramName: string, defaultValue: any, takeFromUrl: boolean = true){
    localParameters.add(paramName);

    var paramValue = takeFromUrl ? urlParams.get(paramName) : null;
    if(paramValue == null ){
      var localValue = localStorage.getItem(`${paramName}Key`);

      if(localValue == null){
        return defaultValue;
      }

      return localValue;
    }

    loadOnRender = true;
    return paramValue;
  }

  /**
   * Sets the value of a parameter in the url and localstorage.
   * @param paramName The name of the parameter to set the value for.
   * @param paramValue The value to set the parameter to.
   */
  function setLocalParamValue(paramName: string, paramValue: any, hideFromUrl: boolean){
    localParameters.add(paramName);

    if(!hideFromUrl){
      urlParams.set(paramName, paramValue);
      // TODO: Make this work without refresh.
      //window.location.search = urlParams.toString();
    }

    localStorage.setItem(`${paramName}Key`, paramValue);
  }

  /**
   * Grabs all used local parameters and sets them in the current url.
   * The url is then copied to the clipboard.
   */
  function copyShareableLink(){
    var currentDomain = window.location.href.split("?")[0];
    var url = new URL(currentDomain);
    var nonShareableParams = ["apiAccessToken", "isLightMode"];

    for(var param of localParameters){
      if(nonShareableParams.includes(param)){
        continue;
      }

      var paramValue = getLocalParamValue(param, null, false);

      // If the parameter is not null, set it in the url. However, order can be null.
      if(paramValue != null || param == "sortedByOrder"){
        url.searchParams.set(param, paramValue);
      }
    }

    navigator.clipboard.writeText(url.toString());

    messageApi.success("Copied link to clipboard!");
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

    if(minBuyFilter > 0 && dataObject.buy_offer.value < minBuyFilter){
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

  function addDataRow(server: string, data: any, tibiaCoinData: any){
    var metaData = itemMetaData[data.id];

    var dataObject: ItemData = new ItemData(server, data, metaData, tibiaCoinData);

    if(!doesDataMatchFilter(dataObject)){
      return;
    }

    if (itemDataDict[data.id] == null){
      dataSource.push(dataObject);
      itemDataDict[data.id] = dataObject;
    } else {
      itemDataDict[data.id].addSiblingObject(dataObject);
    }
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
      sortDirections: ['descend', 'ascend', null],
      render: (text: any, record: any) => {
        return <div>
          <Space>
            <img src={`/sprites/${record.id.value}.gif`}/>
            {nameToWikiLink(text)}
          </Space>
        </div>;
      }
    });

    if (sortedByOrder != "null" && sortedByColumn == columns[columns.length - 1].dataIndex){
      columns[columns.length - 1].sortOrder = sortedByOrder;
    }
    
    // Add all other columns.
    for (const [key, value] of Object.entries(exampleItem)) {
      if(key == "name" || key == "tibiaCoinData" || value.isHidden || !marketColumns.includes(key))
        continue;

      var render = (text: any, metric: any) => {
        let content = metric.localisedValue;

        // Check for additional info and update content accordingly.
        if (metric.additionalInfo.length > 0) {
          content = (
            <AntTooltip style={{ marginLeft: '200px' }} title={newLineToBreaks(metric.additionalInfo)}>
              {text}
            </AntTooltip>
          );
        }

        // Add icon if it exists.
        let iconElement = null;
        if (metric.icon !== "") {
          iconElement = <img src={metric.icon} style={{ height: '20px' }} />;
        }

        // Handle TrendMetric.
        let trendElement = null;

        // Typescript is absolutely terrible. I can't use instanceof.
        if (metric.constructor.name == "TrendMetric") {
          let trendIcon = null;
          if (metric.relativeDifference > 1.1) {
            trendIcon = <RiseOutlined style={{ color: 'green' }} />;
          } else if (metric.relativeDifference < 0.9) {
            trendIcon = <FallOutlined style={{ color: 'red' }} />;
          }

          trendElement = (
            <AntTooltip
              title={`${((metric.relativeDifference - 1) * 100).toFixed(2)}% (was ${metric.previousValue.toFixed(0)})`}
            >
              {trendIcon}
            </AntTooltip>
          );
        }

        // Return final JSX
        return (
          <Space>
            {content}
            {iconElement}
            {trendElement}
          </Space>
        );
      }
      
      columns.push({
        title: value.name,
        dataIndex: [key, 'localisedValue'],
        width: 50,
        sorter: (a: any, b: any) => {
          if (typeof a[key].value == "number")
            return a[key].maxMetric.value - b[key].maxMetric.value;
          else
            return a[key].value.localeCompare(b[key].value);
        },
        sortDirections: ['descend', 'ascend', null],
        render: (text: any, record: any) => {
          var metric = record[key];
          var currentJSX = render(text, metric);

          if(metric.hasSiblings()){
            let sortedSiblings = metric.getSortedSiblings();

            let iconElement = null;
            if (metric.maxMetric.icon !== "") {
              iconElement = <img src={metric.maxMetric.icon} style={{ height: '20px' }} />;
            }
            
            var rangeJSX = <Space>
              {metric.minMetric.localisedValue}
              -
              {metric.maxMetric.localisedValue}
              {iconElement}
            </Space>;

            // If the min and max are the same, only show one value.
            if (metric.minMetric.localisedValue == metric.maxMetric.localisedValue){
              rangeJSX = <Space>
                {metric.minMetric.localisedValue}
                {iconElement}
              </Space>;
            }

            currentJSX = <div></div>
            for(var sibling of sortedSiblings){
              currentJSX = <div>{currentJSX}<Text type='secondary'>{sibling.server}:</Text> {render(sibling.localisedValue, sibling)}</div>;
            }

            currentJSX = <AntTooltip title={currentJSX}>{rangeJSX}</AntTooltip>;
          }

          return currentJSX;
        }
      });

      if (sortedByOrder != "null" && sortedByColumn == key){
        columns[columns.length - 1].sortOrder = sortedByOrder;
      }
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
            <AntTooltip title="View the market board for this item">
              <Button icon={<UnorderedListOutlined />} onClick={async () => {setSelectedItem(record.name); await fetchMarketBoardData(record.id.value); setIsMarketBoardOpen(true);}}></Button>
            </AntTooltip>
            <AntTooltip title="View on TibiaWiki">
              <Button onClick={() => window.open(`https://tibia.fandom.com/wiki/${record.name}`, '_blank')}><img src="/Heavily_Bound_Book.gif" style={{height: '20px', marginLeft: '-8px', marginRight: '-8px' }}/></Button>
            </AntTooltip>
          </Space>
      }
    });

    setColumns([...columns]);
  }

  function setMarketBoardDataColumns(exampleItem: MarketboardTraderData){
    marketBoardColumns = [];
    
    // Add all other columns.
    for (const [key, value] of Object.entries(exampleItem)) {
      if(value.isHidden)
        continue;
      
      marketBoardColumns.push({
        title: value.name,
        dataIndex: [key, 'localisedValue'],
        width: 50,
        sorter: (a: any, b: any) => {
          if (typeof a[key].value == "number")
            return a[key].value - b[key].value;
          else
            return a[key].value.localeCompare(b[key].value);
        },
        sortDirections: ['descend', 'ascend', null],
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

    setMarketBoardColumns([...marketBoardColumns]);
  }

  async function addStatistic(identifier: string, value: string){
    var subIdentifier = marketServer;
    await getDataAsync(`add_statistic?identifier=${identifier}&sub_identifier=${subIdentifier}&value=${value}`, 0);
  }

  /**
   * Fetches the market values and events from the API and populates the dataSource with the data.
   */
  async function fetchData(){
    if (isLoading)
      return;

    setIsLoading(true);

    // Load events if not already loaded.
    await fetchEventHistory();
    itemDataDict = {};
    dataSource = [];

    // Load all market values that are not cached or are outdated.
    var missingServers = marketServer.filter(x => !(x in cachedMarketResponses) || cachedMarketResponses[x].timestamp < new Date(worldDataDict[x].last_update + "Z").getTime());
    if (missingServers.length > 0){
      var missingServerString = missingServers.join(", ");
      var items: string = await getDataAsync(`batch_market_values?limit=5000&servers=${missingServerString}&statistics=${marketColumns.join(",")}`);
      var data = JSON.parse(items);

      for (var i = 0; i < missingServers.length; i++){
        var server = missingServers[i];
        cachedMarketResponses[server] = {"timestamp": new Date().getTime(), "response": JSON.stringify(data[i])};
      }
    }

    await addStatistic("market_values_website", JSON.stringify(nameFilter));

    // Load all market values from cache and add them to the dataSource.
    for (var i = 0; i < marketServer.length; i++){
      var marketValues = JSON.parse(cachedMarketResponses[marketServer[i]].response);
      var tibiaCoinData = isTibiaCoinPriceVisible ? marketValues.find((x: any) => x.id == 22118) : null;
  
      for(var j = 0; j < marketValues.length; j++){
        addDataRow(marketServer[i], marketValues[j], tibiaCoinData);
      }
    }

    setDataColumns(exampleItem);
    setDataSource([...dataSource]);

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

  /**
   * Fetches the event history from the API and sets up the events dictionary.
   */
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

  /**
   * Fetches the world data from the API and sets up the market server options.
   */
  async function fetchWorldData(){
    var isFirstFetch = worldData.length == 0;

    await getTibiaDataWorldDataAsync();
    var items = await getDataAsync("world_data", 0);
    await fetchMetaDataAsync();

    worldData = JSON.parse(items);
    worldDataDict = {};
    for(var i = 0; i < worldData.length; i++){
      worldDataDict[worldData[i].name] = worldData[i];
    }

    setMarketServerOptions(worldData.sort((a, b) => a.name.localeCompare(b.name)).map(x => {
      var tibiaApiData = tibiaDataWorldDataDict[x.name];
      return {label: x.name, value: x.name, metaData: tibiaApiData, timeAgo: unixTimeToTimeAgo(new Date(x.last_update + "Z").getTime())};
    }));

    // Fetch the data immediately if parameters came from the url.
    if(loadOnRender && isFirstFetch){
      await fetchData();
    }
  }

  /**
   * Fetches the market board data for an item and sets up the tables.
   * @param itemId The id of the item to fetch the market board data for.
   */
  async function fetchMarketBoardData(itemId: number){
    setIsLoading(true);

    var sellData: MarketboardTraderData[] = [];
    var buyData: MarketboardTraderData[] = [];

    var item = await getDataAsync(`batch_market_board?servers=${marketServer.join(",")}&item_id=${itemId}`);
    var data = JSON.parse(item);

    for(var i = 0; i < marketServer.length; i++){
      var serverName = marketServer[i];
      var marketBoard: Marketboard = new Marketboard(serverName, data[i]);

      sellData = sellData.concat(marketBoard.sellers);
      buyData = buyData.concat(marketBoard.buyers);
      
      // Add server name to the trader names if there are multiple servers.
      if(marketServer.length > 1){
        marketBoard.sellers.forEach(x => x.name.localisedValue += ` (${serverName})`);
        marketBoard.buyers.forEach(x => x.name.localisedValue += ` (${serverName})`);
      }
    }

    setMarketBoardSellDataSource(sellData);
    setMarketBoardBuyDataSource(buyData);
    setMarketBoardDataColumns(exampleMarketboard);

    setIsLoading(false);
  }

  /**
   * Fetches the price history for an item and sets up the graphs.
   * @param itemId The id of the item to fetch the price history for.
   * @param days The amount of days to fetch the price history for.
   */
  async function fetchPriceHistory(itemId: number, days: number = 30){
    setIsLoading(true);

    var priceGraphData: CustomTimeGraph = new CustomTimeGraph();
    var priceTransactionGraphData: CustomTimeGraph = new CustomTimeGraph();
    var traderGraphData: CustomTimeGraph = new CustomTimeGraph();
    var weekdayPriceGraph: CustomTimeGraph = new CustomTimeGraph();
    var weekdayTransactionGraph: CustomTimeGraph = new CustomTimeGraph();

    var histories = await getDataAsync(`batch_item_history?servers=${marketServer.join(",")}&item_id=${itemId}&start_days_ago=${days}&statistics=${marketColumns.join(",")}`);
    var parsedHistories = JSON.parse(histories);

    // Load tibia coin histories into the cache, if required.
    if (isTibiaCoinPriceVisible){
      var missingServers = marketServer.filter(x => !(x in cachedTibiaCoinHistoryResponses) || cachedTibiaCoinHistoryResponses[x].timestamp < new Date(worldDataDict[x].last_update + "Z").getTime());

      if(missingServers.length > 0){
        var tibiaCoinHistoryResponse = await getDataAsync(`batch_item_history?servers=${missingServers.join(",")}&item_id=22118&start_days_ago=9999&statistics=${marketColumns.join(",")}`);
        var tibiaCoinHistoryData = JSON.parse(tibiaCoinHistoryResponse);

        for (var i = 0; i < missingServers.length; i++){
          var serverName = missingServers[i];
          var tibiaCoinHistory = tibiaCoinHistoryData[i];

          cachedTibiaCoinHistoryResponses[serverName] = {"timestamp": new Date().getTime(), "response": JSON.stringify(tibiaCoinHistory)};
        }
      }
    }

    for(var i = 0; i < marketServer.length; i++){
      var serverName = marketServer[i];
      var tibiaCoinHistory = isTibiaCoinPriceVisible ? JSON.parse(cachedTibiaCoinHistoryResponses[serverName].response) : null;

      // HSL color values for buy and sell offers.
      var buycolor = [243, 51.9, 68.2];
      var sellColor = [143, 40.4, 65.1];
      var traderColor = [300, 51.9, 68.2];

      // Add a shift to the colors depending on the current i value.
      buycolor[0] += (360 / marketServer.length) * i;
      sellColor[0] += (360 / marketServer.length) * i;
      traderColor[0] += (360 / marketServer.length) * i;

      var buyColorExpression = `hsl(${buycolor[0]}, ${buycolor[1]}%, ${buycolor[2]}%)`;
      var sellColorExpression = `hsl(${sellColor[0]}, ${sellColor[1]}%, ${sellColor[2]}%)`;
      var traderColorExpression = `hsl(${traderColor[0]}, ${traderColor[1]}%, ${traderColor[2]}%)`;

      priceGraphData.addDetail(`${serverName}_buyOffer`, buyColorExpression, `Buy offer (${serverName})`);
      priceGraphData.addDetail(`${serverName}_sellOffer`, sellColorExpression, `Sell offer (${serverName})`);

      priceTransactionGraphData.addDetail(`${serverName}_bought`, buyColorExpression, `Bought (${serverName})`);
      priceTransactionGraphData.addDetail(`${serverName}_sold`, sellColorExpression, `Sold (${serverName})`);

      traderGraphData.addDetail(`${serverName}_activeTraders`, traderColorExpression, `Active traders (${serverName})`);

      weekdayPriceGraph.addDetail(`${serverName}_buyOffer`, buyColorExpression, `Median buy offer (${serverName})`);
      weekdayPriceGraph.addDetail(`${serverName}_sellOffer`, sellColorExpression, `Median sell offer (${serverName})`);
      weekdayPriceGraph.isWeekdayGraph = true;

      weekdayTransactionGraph.addDetail(`${serverName}_dayBought`, buyColorExpression, `Median bought (${serverName})`);
      weekdayTransactionGraph.addDetail(`${serverName}_daySold`, sellColorExpression, `Median sold (${serverName})`);
      weekdayTransactionGraph.isWeekdayGraph = true;

      var data = parsedHistories[i];
      var metaData = itemMetaData[itemId];

      var itemData: ItemData[] = [];
      for(var j = 0; j < data.length; j++) {
        var tibiaCoinHistoryIndex = tibiaCoinHistory != null ? Math.max(0, Math.min(tibiaCoinHistory.length - 1, (tibiaCoinHistory.length - data.length) + i)) : -1;
        var tibiaCoinData = tibiaCoinHistory != null ? tibiaCoinHistory[tibiaCoinHistoryIndex] : null;

        var dataObject: ItemData = new ItemData(serverName, data[j], metaData, tibiaCoinData);
        itemData.push(dataObject);
      }

      for(var j = 0; j < itemData.length; j++){
        var data_events: string[] = timestampToEvents(data[j].time, events);
        var dataObject = itemData[j];

        // Price is daily average if available, otherwise it's the current price.
        var priceDatapoint = new CustomHistoryData(dataObject.time.value, data_events);
        if (dataObject.day_average_buy.value >= 0 && dataObject.day_average_sell.value >= 0)
        {
          // If nothing was bought/sold on that day, ignore the price.
          priceDatapoint.addData(`${serverName}_buyOffer`, dataObject.day_average_buy.value > 0 ? dataObject.day_average_buy.value : -1);
          priceDatapoint.addData(`${serverName}_sellOffer`, dataObject.day_average_sell.value > 0 ? dataObject.day_average_sell.value : -1);
        }
        else
        {
          priceDatapoint.addData(`${serverName}_buyOffer`, dataObject.buy_offer.value);
          priceDatapoint.addData(`${serverName}_sellOffer`, dataObject.sell_offer.value);
        }
        
        priceGraphData.addData(priceDatapoint);

        var transactionDatapoint = new CustomHistoryData(dataObject.time.value, data_events);
        transactionDatapoint.addData(`${serverName}_bought`, dataObject.day_bought.value > -1 ? dataObject.day_bought.value :  ~~(dataObject.month_bought.value / 30));
        transactionDatapoint.addData(`${serverName}_sold`, dataObject.day_sold.value > -1 ? dataObject.day_sold.value :  ~~(dataObject.month_sold.value / 30));
        priceTransactionGraphData.addData(transactionDatapoint);

        var traderDatapoint = new CustomHistoryData(dataObject.time.value, data_events);
        traderDatapoint.addData(`${serverName}_activeTraders`, dataObject.active_traders.value);
        traderGraphData.addData(traderDatapoint);

        var medianWeekdayPriceDatapoint = new CustomHistoryData(dataObject.time.value - 86400, data_events);
        medianWeekdayPriceDatapoint.addData(`${serverName}_buyOffer`, dataObject.day_average_buy.value);
        medianWeekdayPriceDatapoint.addData(`${serverName}_sellOffer`, dataObject.day_average_sell.value);
        weekdayPriceGraph.addData(medianWeekdayPriceDatapoint);

        // Set this statistic minus 1 day since they are 1 day delayed.
        var medianWeekdayTransactionDatapoint = new CustomHistoryData(dataObject.time.value - 86400, data_events);
        medianWeekdayTransactionDatapoint.addData(`${serverName}_dayBought`, dataObject.day_bought.value);
        medianWeekdayTransactionDatapoint.addData(`${serverName}_daySold`, dataObject.day_sold.value);
        weekdayTransactionGraph.addData(medianWeekdayTransactionDatapoint);
      }
    }

    console.log(priceGraphData);

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
    setLocalParamValue("isLightMode", isLightMode.toString(), true);
  }, [isLightMode]);

  var [marketServer, setMarketServer] = useState<string[]>(JSON.parse(getLocalParamValue("marketServerValues", JSON.stringify(["Antica"]))));
  useEffect(() => {
    setLocalParamValue("marketServerValues", JSON.stringify(marketServer), true);
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
  
  var [minBuyFilter, setMinBuyFilter] = useState(getLocalParamValue("minBuyFilter", 0));
  useEffect(() => {
    setLocalParamValue("minBuyFilter", minBuyFilter, true);
  }, [minBuyFilter]);

  var [maxBuyFilter, setMaxBuyFilter] = useState(getLocalParamValue("maxBuyFilter", 0));
  useEffect(() => {
    setLocalParamValue("maxBuyFilter", maxBuyFilter, true);
  }, [maxBuyFilter]);

  var [minFlipsFilter, setMinTradesFilter] = useState(getLocalParamValue("minFlipsFilter", 0));
  useEffect(() => {
    setLocalParamValue("minFlipsFilter", minFlipsFilter, true);
  }, [minFlipsFilter]);

  var [maxFlipsFilter, setMaxTradesFilter] = useState(getLocalParamValue("maxFlipsFilter", 0));
  useEffect(() => {
    setLocalParamValue("maxFlipsFilter", maxFlipsFilter, true);
  }, [maxFlipsFilter]);
  
  var [minTradersFilter, setMinOffersFilter] = useState(getLocalParamValue("minTradersFilter", 0));
  useEffect(() => {
    setLocalParamValue("minTradersFilter", minTradersFilter, true);
  }, [minTradersFilter]);

  var [maxTradersFilter, setMaxOffersFilter] = useState(getLocalParamValue("maxTradersFilter", 0));
  useEffect(() => {
    setLocalParamValue("maxTradersFilter", maxTradersFilter, true);
  }, [maxTradersFilter]);

  var [sortedByColumn, setSortedByColumn] = useState(getLocalParamValue("sortedByColumn", null));
  useEffect(() => {
    setLocalParamValue("sortedByColumn", sortedByColumn, true);
  }, [sortedByColumn]);

  var [sortedByOrder, setSortedByOrder] = useState(getLocalParamValue("sortedByOrder", null));
  useEffect(() => {
    setLocalParamValue("sortedByOrder", sortedByOrder, true);
  }, [sortedByOrder]);

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
  var [marketBoardSellDataSource, setMarketBoardSellDataSource] = useState<MarketboardTraderData[]>([]);
  var [marketBoardBuyDataSource, setMarketBoardBuyDataSource] = useState<MarketboardTraderData[]>([]);
  var [marketBoardColumns, setMarketBoardColumns] = useState<ColumnType<MarketboardTraderData>[]>([]);
  var [isLoading, setIsLoading] = useState(false);
  var [columns, setColumns] = useState<ColumnType<ItemData>[]>([]);
  var [selectedItem, setSelectedItem] = useState("");
  var [historyDays, setHistoryDays] = useState(30);
  var [modalPriceHistory, setModalPriceHistory] = useState<CustomTimeGraph>();
  var [modalTraderHistory, setModalTraderHistory] = useState<CustomTimeGraph>();
  var [modalTransationHistory, setModalTransactionHistory] = useState<CustomTimeGraph>();
  var [modalMedianWeekdayPriceHistory, setModalMedianWeekdayPriceHistory] = useState<CustomTimeGraph>();
  var [modalMedianTransactionVolumeHistory, setModalMedianTransactionVolumeHistory] = useState<CustomTimeGraph>();
  var [isModalOpen, setIsModalOpen] = useState(false);
  var [isMarketBoardOpen, setIsMarketBoardOpen] = useState(false);
  var [passwordVisible, setPasswordVisible] = useState(false);
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
          <Form.Item required label='World' tooltip='The world(s) for which the market values are fetched'>
            <Select options={marketServerOptions} suffixIcon={`${marketServer.length} / ${marketServerOptions?.length}`} mode='multiple' defaultValue={marketServer} onChange={(value) => setMarketServer(value)} 
              optionRender={(option) => 
              <Space>
                <Text>{option.data.label}</Text>
                <Text type='secondary'>{option.data.timeAgo}</Text>
                {option.data.metaData.battleye_date == "release" ? <Image src="https://static.tibia.com/images/global/content/icon_battleyeinitial.gif" width={20} preview={false} /> : <Image src="https://static.tibia.com/images/global/content/icon_battleye.gif" width={20} preview={false} />}
                {option.data.metaData.pvp_type.split(" ")[0]}
              </Space>
            }></Select>
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
              <InputNumber placeholder='Minimum' defaultValue={minBuyFilter > 0 ? minBuyFilter : null} onChange={(e) => setMinBuyFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
              -
              <InputNumber placeholder='Maximum' defaultValue={maxBuyFilter > 0 ? maxBuyFilter : null} onChange={(e) => setMaxBuyFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
            </Space>
          </Form.Item>
          <Form.Item label="Flips" tooltip="The amount of times the item can be flipped (bought and sold) per month">
            <Space>
              <InputNumber placeholder='Minimum' defaultValue={minFlipsFilter > 0 ? minFlipsFilter : null} onChange={(e) => setMinTradesFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
              -
              <InputNumber placeholder='Maximum' defaultValue={maxFlipsFilter > 0 ? maxFlipsFilter : null} onChange={(e) => setMaxTradesFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
            </Space>
          </Form.Item>
          <Form.Item label="Traders" tooltip="The amount of buy or sell offers within the past 24 hours, whichever one is smaller. I.e. your competition">
            <Space>
              <InputNumber placeholder='Minimum' defaultValue={minTradersFilter > 0 ? minTradersFilter : null} onChange={(e) => setMinOffersFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
              -
              <InputNumber placeholder='Maximum' defaultValue={maxTradersFilter > 0 ? maxTradersFilter : null} onChange={(e) => setMaxOffersFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
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
            <Button htmlType="submit" id='search-button' onClick={fetchData} loading={isLoading} disabled={marketServer.length == 0}>
              Search
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
      <Layout className="site-layout" style={{ width: '100%' }}>
        <Header style={{ backgroundColor: isLightMode ? "#ffffff" : "#101010", borderBottom: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Button icon={<MenuOutlined />} onClick={() => setIsDrawerOpen(true)} style={{ position: 'fixed', left: '16px' }} />
          <AntTooltip title="Copy your current search parameters as a shareable link">
            <Button icon={<ShareAltOutlined />} onClick={copyShareableLink} style={{ position: 'fixed', left: '52px' }}>Share</Button>
          </AntTooltip>

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
                  <DynamicChart timeGraph={modalPriceHistory!} isLightMode={isLightMode} animate={marketServer.length == 1}></DynamicChart>
                </Panel>
                <Panel header="Transactions over time" key="2">
                  <DynamicChart timeGraph={modalTransationHistory!} isLightMode={isLightMode} animate={marketServer.length == 1}></DynamicChart>
                </Panel>
                <Panel header="Median price per weekday" key="3">
                  <DynamicChart timeGraph={modalMedianWeekdayPriceHistory!} isLightMode={isLightMode} animate={marketServer.length == 1}></DynamicChart>
                </Panel>
                <Panel header="Median transactions per weekday" key="4">
                  <DynamicChart timeGraph={modalMedianTransactionVolumeHistory!} isLightMode={isLightMode} animate={marketServer.length == 1}></DynamicChart>
                </Panel>
              </Collapse>
            </Spin>
          </Modal>
          <Modal
            title=<div>
            Market board for {nameToWikiLink(selectedItem)} 
            </div>
            centered 
            open={isMarketBoardOpen}
            onOk={() => setIsMarketBoardOpen(false)}
            onCancel={() => setIsMarketBoardOpen(false)}
            style={{ minWidth: '80vw' }}
          >
            <Spin spinning={isLoading}>
              <Collapse defaultActiveKey={[1,2]}>
                <Panel header="Sellers" key="1">
                  <Table id='marketboard-sellers-table' dataSource={marketBoardSellDataSource} columns={marketBoardColumns} loading={isLoading} pagination={false} scroll={{ y: 275 }}></Table>
                </Panel>
                <Panel header="Buyers" key="2">
                  <Table id='marketboard-buyers-table' dataSource={marketBoardBuyDataSource} columns={marketBoardColumns} loading={isLoading} pagination={false} scroll={{ y: 275 }}></Table>
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
