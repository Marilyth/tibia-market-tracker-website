import React, { useEffect, useState }  from 'react';
import type { MenuProps } from 'antd';
import { Layout, Collapse, Tooltip as AntTooltip, message, Menu, theme, Select, Button, Input, ConfigProvider, InputNumber, Space, Switch, Table, Typography, Pagination, Image, Modal, Alert, AlertProps, Form, SelectProps } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import {LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ResponsiveContainer, Tooltip, Brush } from 'recharts';
import './App.css';
import { ColumnType } from 'antd/es/table';
import { HistoryData, ItemData, WeekdayData, Metric, exampleItem } from './utils/data';
import { linearRegressionLeastSquares } from './utils/math'
import { CustomTooltip } from './utils/CustomToolTip';
import { Timestamp } from './utils/Timestamp';

const { Header, Content, Footer, Sider } = Layout;
const { Title } = Typography;
const { Panel } = Collapse;

var events: { [date: string]: string[]} = {}
var itemNames: {[lowerCaseName: string]: string} = {}
var cachedMarketResponses: {[server: string]: string} = {};

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
    //console.log(pagination, filters, sorter);
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

    if(minBuyFilter > -1 && dataObject.buyPrice.value < minBuyFilter){
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

  function addDataRow(data: any){
    var name = dataNameToOriginalName(data.name);

    // Some data is not up to date. If it is old, add the missing values as -1.
    if(!("lowest_sell" in data)){
      data.lowest_sell = -1;
      data.lowest_buy = -1;
      data.highest_sell = -1;
      data.highest_buy = -1;
      data.sell_offers = -1;
      data.buy_offers = -1;
    }

    var dataObject: ItemData = new ItemData(name, data.sell_offer, data.buy_offer, data.month_sell_offer, data.month_buy_offer, data.lowest_sell, data.lowest_buy, data.highest_sell, data.highest_buy, data.sold, data.bought, data.sell_offers, data.buy_offers, data.active_traders);

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
          <img src={itemToImage(text)}/> <br></br>
          {itemToWikiLink(text)}
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
          return a[key].value - b[key].value;
        },
        sortDirections: ['descend', 'ascend', 'descend'],
      });
    }

    setColumns([...columns]);
  }

  async function fetchData(){
    if (isLoading)
      return;

    setIsLoading(true);
    setLastUpdated(0);

    // Load tracked item names if not already loaded.
    if(!("sword" in itemNames))
      await fetchItemNamesAsync();

    // Load events if not already loaded.
    if(Object.keys(events).length == 0)
      await fetchEventHistory();

    // Check if marketServer is in cachedMarketResponse.
    if (!(marketServer in cachedMarketResponses)){
      var market_data_url: string = `https://api.tibiamarket.top:8001/market_values?limit=4000&server=${marketServer}`;
      
      var items = await fetch(market_data_url, {headers: {"Authorization": `Bearer ${apiKey}`}}).then(async response => {
        if(response.status != 200){
            setIsLoading(false);

            var errorMessage = `${response.statusText}. ${await response.text()}`;
            throw new Error(errorMessage);
        }

        return response.text();
      }).catch((error) => {
        setIsLoading(false);
        messageApi.error(`Fetching market data failed, please try again in a bit!`, 10);
        messageApi.error(error.message, 10);

        throw new Error("Fetching items failed!");
      });

      cachedMarketResponses[marketServer] = items;
    }

    var marketValues = JSON.parse(cachedMarketResponses[marketServer]);

    var data = marketValues.values;
    dataSource = [];

    for(var i = 0; i < data.length; i++){
      addDataRow(data[i]);
    }

    setDataColumns(exampleItem);
    setDataSource([...dataSource]);

    // If data has values, set the last updated timestamp to the maximum timestamp of the data.
    if(data.length > 0){
      setLastUpdated(Math.max(...data.map((x: any) => x.time)));
    }

    setIsLoading(false);
  }

  /**
   * Fetches all tracked item names from tracked_items.txt, and maps their lowercase version to original version
   * in the itemNames dictionary.
   */
  async function fetchItemNamesAsync(){
    var market_data_url: string = "https://raw.githubusercontent.com/Marilyth/tibia-market-tracker-website/main/items.csv"

    var items = await fetch(market_data_url).then(async response => {
      if(response.status != 200){
          var errorMessage = `${response.statusText}. ${await response.text()}`;
          throw new Error(errorMessage);
      }

      return response.text();
    }).catch((error) => {
      messageApi.error(`Fetching item names failed, please try again in a bit!`, 10);
      messageApi.error(error.message, 10);

      throw new Error("Fetching tracked items failed!");
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
    var history_data_url: string = `https://api.tibiamarket.top:8001/events`;

    var eventResponse = await fetch(history_data_url, {headers: {"Authorization": `Bearer ${apiKey}`}}).then(async response => {
      if(response.status != 200){
          setIsLoading(false);

          var errorMessage = `${response.statusText}. ${await response.text()}`;
          throw new Error(errorMessage);
      }

      return response.text();
    }).catch((error) => {
      setIsLoading(false);
      messageApi.error(`Fetching item history failed, please try again in a bit!`, 10);
      messageApi.error(error.message, 10);
      
      throw new Error("Fetching items failed!");
    });

    var eventValues = JSON.parse(eventResponse);
    var eventEntries = eventValues.events;

    for(var i = 0; i < eventEntries.length; i++){
      var date = eventEntries[i].date;
      var eventNames = eventEntries[i].events;
      events[date] = eventNames;
    }
  }

  async function fetchPriceHistory(itemName: string){
    var history_data_url: string = `https://api.tibiamarket.top:8001/item_history?server=${marketServer}&item=${encodeURIComponent(itemName.toLowerCase())}`;
    setIsLoading(true);

    setModalPriceHistory([]);
    setmodalWeekdayHistory([]);

    var item = await fetch(history_data_url, {headers: {"Authorization": `Bearer ${apiKey}`}}).then(async response => {
      if(response.status != 200){
          setIsLoading(false);

          var errorMessage = `${response.statusText}. ${await response.text()}`;
          throw new Error(errorMessage);
      }

      return response.text();
    }).catch((error) => {
      setIsLoading(false);
      messageApi.error(`Fetching item history for ${itemName} failed, please try again in a bit!`, 10);
      messageApi.error(error.message, 10);

      throw new Error("Fetching items failed!");
    });

    var graphData: HistoryData[] = [];
    var weekdayData: WeekdayData[] = [];
    for(var i = 0; i < 7; i++){
      weekdayData.push(new WeekdayData(i));
    }

    var itemValues = JSON.parse(item);

    var data = itemValues.history;
    for(var i = 0; i < data.length; i++){
      var historyData = new HistoryData(data[i].buy_offer, data[i].sell_offer, data[i].bought, data[i].sold, data[i].active_traders, data[i].time, timestampToEvents(data[i].time));
      graphData.push(historyData);
      
      // Subtract 9 hours to make days start at server-save. (technically 8 hours CET, 9 hours CEST, but this is easier)
      var date: number = new Date((historyData.time - 32400) * 1000).getUTCDay();
      weekdayData[date].addOffer(historyData.buyOffer ?? 0, historyData.sellOffer ?? 0);
    }

    var filteredBuyGraphData = graphData.filter(x => x.buyOffer != null);
    var filteredSellGraphData = graphData.filter(x => x.sellOffer != null);

    // Draw trendlines if there are at least 3 data points.
    if(filteredBuyGraphData.length >= 3){
      var buyRegression = linearRegressionLeastSquares(filteredBuyGraphData.map(x => x.time), filteredBuyGraphData.map(x => x.buyOffer!));

        for(var i = 0; i < filteredBuyGraphData.length; i++){
          filteredBuyGraphData[i].buyTrend = buyRegression.m * filteredBuyGraphData[i].time + buyRegression.b;
        }
    }

    if(filteredSellGraphData.length >= 3){
      var sellRegression = linearRegressionLeastSquares(filteredSellGraphData.map(x => x.time), filteredSellGraphData.map(x => x.sellOffer!));

        for(var i = 0; i < filteredSellGraphData.length; i++){
          filteredSellGraphData[i].sellTrend = sellRegression.m * filteredSellGraphData[i].time + sellRegression.b;
        }
    }

    for(var i = 0; i < weekdayData.length; i++){
      weekdayData[i].calculateMedian();
    }

    setModalPriceHistory(graphData);
    setmodalWeekdayHistory(weekdayData);

    setIsLoading(false);
  }

  const [messageApi, contextHolder] = message.useMessage(); 
  const { defaultAlgorithm, darkAlgorithm } = theme;
  var [isLightMode, setIsLightMode] = useState(localStorage.getItem("isLightModeKey") != "false");
  useEffect(() => {
    localStorage.setItem("isLightModeKey", isLightMode.toString());
  }, [isLightMode]);

  var [marketServer, setMarketServer] = useState(localStorage.getItem("marketServerKey") ?? "Antica");
  useEffect(() => {
    localStorage.setItem("marketServerKey", marketServer);
  }, [marketServer]);

  var [marketColumns, setMarketColumns] = useState(JSON.parse(localStorage.getItem("selectedMarketColumnsKey") ?? JSON.stringify(["sellPrice", "buyPrice"])));
  useEffect(() => {
    localStorage.setItem("selectedMarketColumnsKey", JSON.stringify(marketColumns));
    setDataColumns(exampleItem);
  }, [marketColumns]);

  var [apiKey, setApiKey] = useState(localStorage.getItem("accessTokenKey") ?? "");
  useEffect(() => {
    localStorage.setItem("accessTokenKey", apiKey);
  }, [apiKey]);
  
  var marketServerOptions: SelectProps['options'] = [{value: "Antica", label: "Antica"}, {value: "Dia", label: "Dia"},  {value: "Vunira", label: "Vunira"}];
  // Make all columns optional.
  var marketColumnOptions: SelectProps['options'] = [];
  for (const [key, value] of Object.entries(exampleItem)) {
    if(key == "name")
      continue;

    marketColumnOptions.push({
      value: key,
      label: <div>{value.name} <AntTooltip title={value.description}><QuestionCircleOutlined /></AntTooltip></div>,
    });
  }

  var [dataSource, setDataSource] = useState<ItemData[]>([]);
  var [isLoading, setIsLoading] = useState(false);
  var [columns, setColumns] = useState<ColumnType<ItemData>[]>([]);
  var [nameFilter, setNameFilter] = useState("");
  var [minBuyFilter, setMinBuyFilter] = useState(-1);
  var [maxBuyFilter, setMaxBuyFilter] = useState(0);
  var [minFlipsFilter, setMinTradesFilter] = useState(-1);
  var [maxFlipsFilter, setMaxTradesFilter] = useState(0);
  var [minTradersFilter, setMinOffersFilter] = useState(-1);
  var [maxTradersFilter, setMaxOffersFilter] = useState(0);
  var [selectedItem, setSelectedItem] = useState("");
  var [modalPriceHistory, setModalPriceHistory] = useState<HistoryData[]>([]);
  var [modalWeekdayHistory, setmodalWeekdayHistory] = useState<WeekdayData[]>([]);
  var [isModalOpen, setIsModalOpen] = useState(false);
  var [passwordVisible, setPasswordVisible] = useState(false);
  var [lastUpdated, setLastUpdated] = useState(0);

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
    {contextHolder}
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
          <Form.Item>
            <Select options={marketServerOptions} defaultValue={marketServer} onChange={(value) => setMarketServer(value)}></Select>
            <Timestamp relative={true} timestamp={lastUpdated}/>
          </Form.Item>
          <Form.Item>
            <Input placeholder='Name' onChange={(e) => setNameFilter(e.target.value)}></Input>
          </Form.Item>
          <Form.Item>
            <InputNumber placeholder='Minimum buy price' onChange={(e) => setMinBuyFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
            <InputNumber placeholder='Maximum buy price' onChange={(e) => setMaxBuyFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
          </Form.Item>
          <Form.Item>
            <InputNumber placeholder='Minimum flips' onChange={(e) => setMinTradesFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
            <InputNumber placeholder='Maximum flips' onChange={(e) => setMaxTradesFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
          </Form.Item>
          <Form.Item>
            <InputNumber placeholder='Minimum traders' onChange={(e) => setMinOffersFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
            <InputNumber placeholder='Maximum traders' onChange={(e) => setMaxOffersFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
          </Form.Item>
          <Form.Item>
            <Input.Password placeholder="Access token" defaultValue={apiKey} onChange={(e) => setApiKey(e.target.value)} />
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
                <XAxis domain={["dataMin", "dataMax + 1"]} allowDuplicatedCategory={false} type='number' dataKey="time" tickFormatter={(date) => new Date(date * 1000).toLocaleString('en-GB', dateOptions)}/>
                <YAxis />
                <CartesianGrid stroke="#eee" strokeDasharray="5 5"/>
                <Tooltip content={<CustomTooltip/>} contentStyle={{backgroundColor: isLightMode ? "#FFFFFFBB" : "#141414BB", border: isLightMode ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.5)'}} labelFormatter={(date) => <div>
                                                        {new Date(date * 1000).toLocaleString('en-GB', weekdayDateOptions)}
                                                        <p style={{ color: "#ffb347"}}>{timestampToEvents(date).join(", ")}</p>
                                                   </div>} formatter={(value, name) => value.toLocaleString()}></Tooltip>
                <Line name="Buy Price" connectNulls type='monotone' dataKey="buyOffer" stroke="#8884d8" dot={false} />
                <Line name="Sell Price" connectNulls type='monotone' dataKey="sellOffer" stroke="#82ca9d" dot={false} />
                
                <Line connectNulls type='monotone' dataKey="buyTrend" name="Buy Trend Hidden" stroke="#8884d877" strokeDasharray="3 3" dot={false} activeDot={false} />
                <Line connectNulls type='monotone' dataKey="sellTrend" name="Sell Trend Hidden" stroke="#82ca9d77" strokeDasharray="3 3" dot={false} activeDot={false}/>
                
                <Brush data={modalPriceHistory} fill={isLightMode ? "#FFFFFF" : "#141414"} dataKey="time" tickFormatter={(date) => new Date(date * 1000).toLocaleString('en-GB', dateOptions)}></Brush>
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
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="Select the table columns you want to see"
            defaultValue={marketColumns}
            onChange={setMarketColumns}
            options={marketColumnOptions}
          />
          <Table id='items-table' scroll={{ y: '60vh'}} dataSource={dataSource} columns={columns} loading={isLoading} onRow={(record, rowIndex) => {
              return {
                onClick: async (event) => {setSelectedItem(record.name); await fetchPriceHistory(record.name); setIsModalOpen(true);}
              };
            }} onChange={handleTableChanged}>
        </Table>
        </Content>
        
        <Footer style={{
          borderTop: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
          
          textAlign: 'center',
        }}>
          ❤️ Please consider donating a few TC or gold to <a href="https://www.tibia.com/community/?name=leenia">Leenia</a> on Antica to help out! ❤️ <br></br>
          For support or to request access, please join the <a href="https://discord.gg/Rvc8mXtmZH">Discord server</a>.
        </Footer>
      </Layout>
    </Layout>
  </ConfigProvider>
  );
};

export default App;
