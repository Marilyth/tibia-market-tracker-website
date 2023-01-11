import React, { useState }  from 'react';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme, Select, Button, Input, ConfigProvider, InputNumber, Space, Switch, Table, Typography, Pagination, Image} from 'antd';
import './App.css';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;
const { Title } = Typography;

function doesDataMatchFilter(dataObject: any){
  // Filter input by user.
  if(nameFilter != "" && !dataObject["Name"].includes(nameFilter)){
    return false;
  } 

  if(maxBuyFilter > 0 && dataObject["BuyPrice"] > maxBuyFilter){
    return false;
  }

  if(dataObject["BuyPrice"] < minBuyFilter){
    return false;
  }

  if(Math.min(dataObject["Sold"], dataObject["Bought"]) < minTradesFilter){
    return false;
  }

  if(maxTradesFilter > 0 && Math.min(dataObject["Sold"], dataObject["Bought"]) > maxTradesFilter){
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
    dataObject[columns[j]["dataIndex"]] = columns[j]["dataIndex"] == "Name" ? columnData[j] : +columnData[j];
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
      var valA = a[column];
      var valB = b[column];

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

  var market_data_url: string = "https://raw.githubusercontent.com/Marilyth/tibia-market-tracker-data/main/fullscan.csv"
    
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
    addDataRow(data[i]);
  }

  setDataSource([...dataSource]);
  setIsLoading(false);
}

var nameFilter: string = "";
var minBuyFilter: number;
var maxBuyFilter: number;
var minTradesFilter: number;
var maxTradesFilter: number;
var setNameFilter: any;
var setMinBuyFilter: any;
var setMaxBuyFilter: any;
var setMinTradesFilter: any;
var setMaxTradesFilter: any;

var isLoading: boolean;
var setIsLoading: any;

var setDataSource: any;
var setColumns: any;
var dataSource: any[] = [];
var columns: any[] = [];

const App: React.FC = () => {
  [dataSource, setDataSource] = useState(dataSource);
  [isLoading, setIsLoading] = useState(false);
  [columns, setColumns] = useState(columns);
  [nameFilter, setNameFilter] = useState(nameFilter);
  [minBuyFilter, setMinBuyFilter] = useState(minBuyFilter);
  [maxBuyFilter, setMaxBuyFilter] = useState(maxBuyFilter);
  [minTradesFilter, setMinTradesFilter] = useState(minTradesFilter);
  [maxTradesFilter, setMaxTradesFilter] = useState(maxTradesFilter);
  const [collapsed, setCollapsed] = useState(false);

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
          <InputNumber placeholder='Minimum buy price' type='number' onChange={(e) => setMinBuyFilter(e)}></InputNumber>
          <InputNumber placeholder='Maximum buy price' type='number' onChange={(e) => setMaxBuyFilter(e)}></InputNumber><br/><br/>
          <InputNumber placeholder='Minimum flips/month' type='number' onChange={(e) => setMinTradesFilter(e)}></InputNumber>
          <InputNumber placeholder='Maximum flips/month' type='number' onChange={(e) => setMaxTradesFilter(e)}></InputNumber><br/><br/>

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
          <Table id='items-table' dataSource={dataSource} columns={columns} loading={isLoading} scroll={{y:'83vh'}}></Table>
        </Content>
      </Layout>
    </Layout>
  </ConfigProvider>
  );
};

export default App;
