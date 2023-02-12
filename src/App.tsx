import React, { useState }  from 'react';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme, Select, Button, Input, ConfigProvider, InputNumber, Space, Switch, Table, Typography, Pagination, Image, Modal} from 'antd';
import {LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ResponsiveContainer, Tooltip} from 'recharts';
import './App.css';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;
const { Title } = Typography;

class HistoryData{
  buyOffer: number;
  sellOffer: number;
  time: number;

  constructor(buy: number, sell: number, time: number){
    this.buyOffer = buy;
    this.sellOffer = sell;
    this.time = time;
  }
}

class WeekdayData{
  private totalOffers: number = 0;
  private totalBuyPrice: number = 0;
  private totalSellPrice: number = 0;
  public static weekdays: string[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  public avgBuyOffer: number = 0;
  public avgSellOffer: number = 0;

  weekday: number;

  constructor(weekday: number){
    this.weekday = weekday;
  }

  /**
   * Adds the prices to the weekday and recalculates the average.
   */
  public addOffer(buyPrice: number, sellPrice: number) {
    this.totalOffers += 1;
    this.totalBuyPrice += buyPrice;
    this.totalSellPrice += sellPrice;
    this.avgBuyOffer = this.totalBuyPrice / this.totalOffers;
    this.avgSellOffer = this.totalSellPrice / this.totalOffers;
  }
}

const App: React.FC = () => {
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
      dataObject[columns[j]["dataIndex"]] = columns[j]["dataIndex"] == "Name" ? columnData[j] : (+columnData[j]).toLocaleString();
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
      sortDirections: ['descend', 'ascend', 'descend']
    }));

    // Fix name column.
    columns[0]["fixed"] = "left";

    setColumns([...columns]);
  }

  async function fetchData(){
    setIsLoading(true);

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
    setIsLoading(false);
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
        var historyData = new HistoryData(+values[2], +values[1], +values[values.length - 1]);
        graphData.push(historyData);

        var date: number = new Date(historyData.time * 1000).getDay();
        weekdayData[date].addOffer(historyData.buyOffer, historyData.sellOffer);
      }
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
  var [collapsed, setCollapsed] = useState(false);

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
          height: '100vh',
          padding: 10,
          borderRight: '1px solid rgba(0,0,0,0.1)',
        }}
        collapsible
        collapsed={collapsed}
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
      <Header style={{backgroundColor: 'white', borderBottom: '1px solid rgba(0,0,0,0.1)'}}>
          {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
            className: 'trigger',
            onClick: () => setCollapsed(!collapsed),
          })}
        </Header>
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
                <Tooltip labelFormatter={(date) => new Date(date * 1000).toLocaleString('en-GB', weekdayDateOptions)} formatter={(x) => x.toLocaleString()}></Tooltip>
                <Line type='monotone' dataKey="buyOffer" stroke="#8884d8" dot={false} />
                <Line type='monotone' dataKey="sellOffer" stroke="#82ca9d" dot={false} />
              </LineChart>
            </ResponsiveContainer>

            <ResponsiveContainer width='100%' height={200}>
              <BarChart data={modalWeekdayHistory}>
                <XAxis dataKey="weekday" tickFormatter={(day) => WeekdayData.weekdays[day]}/>
                <YAxis />
                <Bar dataKey="avgSellOffer" barSize={30} fill="#82ca9d"/>
                <Bar dataKey="avgBuyOffer" barSize={30} fill="#8884d8"/>
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
