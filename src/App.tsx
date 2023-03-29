import React, { useState }  from 'react';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme, Select, Button, Input, ConfigProvider, InputNumber, Space, Switch, Table, Typography, Pagination, Image, Modal } from 'antd';
import {LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ResponsiveContainer, Tooltip} from 'recharts';
import './App.css';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;
const { Title } = Typography;
var events: { [date: string]: string[]} = {}
var itemNames: {[lowerCaseName: string]: string} = {}

class HistoryData{
  buyOffer: number;
  sellOffer: number;
  time: number;
  events: string[];

  constructor(buy: number, sell: number, time: number, events: string[]){
    this.buyOffer = buy;
    this.sellOffer = sell;
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
   * Returns the nabbot image url of the item.
   * @param itemName The item name to return the image url for.
   */
  function itemToImage(itemName: string): string{
    var originalItemName: string = itemNames[itemName.toLowerCase().trim()];
    return `https://static.nabbot.xyz/tibiawiki/item/${originalItemName}.gif`
  }

  function doesDataMatchFilter(dataObject: any){
    // Filter input by user.
    if(nameFilter != "" && !dataObject["Name"].toLowerCase().includes(nameFilter.toLowerCase())){
      return false;
    } 

    if(maxBuyFilter > 0 && dataObject["BuyPriceValue"] > maxBuyFilter){
      return false;
    }

    if(dataObject["BuyPriceValue"] < minBuyFilter){
      return false;
    }

    if(Math.min(dataObject["SoldValue"], dataObject["BoughtValue"]) < minTradesFilter){
      return false;
    }

    if(maxTradesFilter > 0 && Math.min(dataObject["SoldValue"], dataObject["BoughtValue"]) > maxTradesFilter){
      return false;
    }

    if(maxOffersFilter > 0 && dataObject["ApproxOffers"] > maxOffersFilter){
      return false;
    }

    if(dataObject["ApproxOffers"] < minOffersFilter){
      return false;
    }

    return true;
  }

  function addDataRow(data: string){
    var dataObject: any = {}

    // Filter bad data.
    if (data.includes("-1"))
      return;

    var columnData: string[] = data.split(",");
    for(var j = 0; j < columnData.length; j++){
      // Keep dataValue for sorting by localised number.
      dataObject[columns[j]["dataIndex"]] = columns[j]["dataIndex"] == "Name" ? itemNames[columnData[j]] : (+columnData[j]).toLocaleString();
      dataObject[`${columns[j]["dataIndex"]}Value`] = columns[j]["dataIndex"] == "Name" ? columnData[j] : +columnData[j];
    }

    if(!doesDataMatchFilter(dataObject)) 
      return;

    dataSource.push(dataObject);
  }

  function setDataColumns(header: string){
    columns = [];
    dataSource = [];
    header.split(",").forEach((column: string) => columns.push({
      title: column,
      dataIndex: column,
      width: 100,
      sorter: (a: any, b: any) => {
        // Sort by original value, not modified expression.
        var valA = a[`${column}Value`];
        var valB = b[`${column}Value`];

        return valA > valB ? 1 : valA == valB ? 0 : -1;
      },
      sortDirections: ['descend', 'ascend', 'descend'],

      // Include image if Name column.
      render: (text: any, record: any) => {
        if(column == "Name")
          return <div>
            <img src={itemToImage(text)}/> <br></br>
            {text}
            </div>;
        return text;
      }
    }));

    // Fix name column.
    columns[0]["fixed"] = "left";

    setColumns([...columns]);
  }

  async function fetchData(){
    setIsLoading(true);

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
    setDataColumns(header);

    for(var i = 1; i < data.length; i++){
      if(data[i].length > 0)
        addDataRow(data[i]);
    }

    setDataSource([...dataSource]);

    await fetchEventHistory();

    setIsLoading(false);
  }

  /**
   * Fetches all tracked item names from tracked_items.txt, and maps their lowercase version to original version
   * in the itemNames dictionary.
   */
  async function fetchItemNamesAsync(){
    var market_data_url: string = "https://raw.githubusercontent.com/Marilyth/tibia-market-tracker/main/tracked_items.txt"
        
    var items = await fetch(market_data_url).then(response => {
      if(response.status != 200){
          throw new Error("Fetching tracked items failed!");
      }

      return response.text();
    });
    
    for(var item of items.split("\n")){
      itemNames[item.toLowerCase()] = item;
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

      if(values.length > 1 && !data[i].includes(",-1")){
        var historyData = new HistoryData(+values[2], +values[1], +values[values.length - 1], timestampToEvents(+values[values.length - 1]));
        graphData.push(historyData);
        
        // Subtract 9 hours to make days start at server-save. (technically 8 hours CET, 9 hours CEST, but this is easier)
        var date: number = new Date((historyData.time - 32400) * 1000).getUTCDay();
        weekdayData[date].addOffer(historyData.buyOffer, historyData.sellOffer);
      }
    }

    for(var i = 0; i < weekdayData.length; i++){
      weekdayData[i].calculateMedian();
    }

    setModalPriceHistory(graphData);
    setmodalWeekdayHistory(weekdayData);
  }

  var [dataSource, setDataSource] = useState<any[]>([]);
  var [isLoading, setIsLoading] = useState(false);
  var [columns, setColumns] = useState<any[]>([]);
  var [nameFilter, setNameFilter] = useState("");
  var [minBuyFilter, setMinBuyFilter] = useState(0);
  var [maxBuyFilter, setMaxBuyFilter] = useState(0);
  var [minTradesFilter, setMinTradesFilter] = useState(0);
  var [maxTradesFilter, setMaxTradesFilter] = useState(0);
  var [minOffersFilter, setMinOffersFilter] = useState(0);
  var [maxOffersFilter, setMaxOffersFilter] = useState(0);
  var [modalTitle, setModalTitle] = useState("");
  var [modalPriceHistory, setModalPriceHistory] = useState<HistoryData[]>([]);
  var [modalWeekdayHistory, setmodalWeekdayHistory] = useState<WeekdayData[]>([]);
  var [isModalOpen, setIsModalOpen] = useState(false);

  var weekdayDateOptions: Intl.DateTimeFormatOptions = {hour12: true, weekday: "short", year: "numeric", month: "short", day: "numeric", hour: '2-digit', minute:'2-digit'};
  var dateOptions: Intl.DateTimeFormatOptions = {hour12: true, year: "numeric", month: "short", day: "numeric"}

  return (
  <ConfigProvider
    theme={{
      token:{
      },
      components:{
      }
  }}>
    <title>Test</title>
    <Layout hasSider>
      <Sider
        style={{
          overflow: 'auto',
          padding: 10,
          borderRight: '1px solid rgba(0,0,0,0.1)',
        }}
        trigger={null}
        theme='light'
      >
          <div id='title' style={{borderBottom: '1px solid rgba(0,0,0,0.1)'}}>
            <Title level={4} style={{textAlign:'center'}}>
              Market Tracker
            </Title>
          </div>
          <Title level={5} style={{textAlign:'center', color:'grey'}}>
              Filters
            </Title>
          <Input placeholder='Name' onChange={(e) => setNameFilter(e.target.value)}></Input><br/><br/>
          <InputNumber placeholder='Minimum buy price' onChange={(e) => setMinBuyFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
          <InputNumber placeholder='Maximum buy price' onChange={(e) => setMaxBuyFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber><br/><br/>
          <InputNumber placeholder='Minimum flips/month' onChange={(e) => setMinTradesFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
          <InputNumber placeholder='Maximum flips/month' onChange={(e) => setMaxTradesFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber><br/><br/>
          <InputNumber placeholder='Minimum trade offers' onChange={(e) => setMinOffersFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber>
          <InputNumber placeholder='Maximum trade offers' onChange={(e) => setMaxOffersFilter(e == null ? 0 : +e)} formatter={(value) => value ? (+value).toLocaleString() : ""}></InputNumber><br/><br/>

          <Button id='search-button' style={{marginTop: '5%'}} onClick={fetchData} loading={isLoading}>
            Search
          </Button>
      </Sider>
      <Layout className="site-layout" style={{ width: '100%' }}>
        <Content style={{ margin: '24px 16px 0', overflow: 'auto', height:'97vh' }}>
          <Modal
            title={modalTitle}
            centered
            open={isModalOpen}
            onOk={() => setIsModalOpen(false)}
            onCancel={() => setIsModalOpen(false)}
            width='50%'
          >
            <ResponsiveContainer width='100%' height={200}>
              <LineChart data={modalPriceHistory}>
                <XAxis domain={["dataMin", "dataMax + 1"]} type='number' dataKey="time" tickFormatter={(date) => new Date(date * 1000).toLocaleString('en-GB', dateOptions)}/>
                <YAxis />
                <CartesianGrid stroke="#eee" strokeDasharray="5 5"/>
                <Tooltip labelFormatter={(date) => <div>
                                                        {new Date(date * 1000).toLocaleString('en-GB', weekdayDateOptions)}
                                                        <p style={{ color: "#ffb347"}}>{timestampToEvents(date).join(", ")}</p>
                                                   </div>} formatter={(x) => x.toLocaleString()}></Tooltip>
                <Line type='monotone' dataKey="buyOffer" stroke="#8884d8" dot={false} />
                <Line type='monotone' dataKey="sellOffer" stroke="#82ca9d" dot={false} />
              </LineChart>
            </ResponsiveContainer>

            <ResponsiveContainer width='100%' height={200}>
              <BarChart data={modalWeekdayHistory}>
                <XAxis dataKey="weekday" tickFormatter={(day) => WeekdayData.weekdays[day]}/>
                <YAxis />
                <Bar dataKey="medianSellOffer" barSize={30} fill="#82ca9d"/>
                <Bar dataKey="medianBuyOffer" barSize={30} fill="#8884d8"/>
                <Tooltip cursor={{fill: '#00000011'}} labelFormatter={(day) => WeekdayData.weekdays[day]} formatter={(x) => x.toLocaleString()}></Tooltip>
              </BarChart>
            </ResponsiveContainer>
            
          </Modal>
          <Table id='items-table' dataSource={dataSource} columns={columns} loading={isLoading} scroll={{y:'83vh'}} onRow={(record, rowIndex) => {
              return {
                onClick: (event) => {setModalTitle("price history: " + record["Name"]); fetchPriceHistory(record["Name"]); setIsModalOpen(true);}
              };
            }}>
        </Table>
        </Content>
      </Layout>
    </Layout>
  </ConfigProvider>
  );
};

export default App;
