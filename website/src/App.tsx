import React, { useState }  from 'react';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme, Select, Button, Input, ConfigProvider, InputNumber, Space, Switch, Table, Typography, Pagination} from 'antd';
import './App.css';

const { Header, Content, Footer, Sider } = Layout;
const { Title } = Typography;

function test(){
  setDataSource([...dataSource]);
}

var setDataSource: any;
var dataSource = [
  {
    name: 'Mike',
    age: 32,
    address: '10 Downing Street',
  },
  {
    name: 'John',
    age: 42,
    address: '10 Downing Street',
  },
];

const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
];

const App: React.FC = () => {
  [dataSource, setDataSource] = useState(dataSource);

  return (
  <ConfigProvider
    theme={{
      token:{
      },
      components:{
      }
  }}>
    
    <Layout hasSider>
      <Sider
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          padding: 10,
          borderRight: '1px solid rgba(0,0,0,0.1)',
        }}
        theme='light'
      >
          <div id='title' style={{borderBottom: '1px solid rgba(0,0,0,0.1)'}}>
            <Title level={4} style={{textAlign:'center'}}>
              Market Tracker
            </Title>
          </div>

          <Input id="name-input" placeholder='Name' ></Input><br/><br/>
          <InputNumber id="min-traded-input" placeholder='Minimum amount traded' type='number'></InputNumber>
          <InputNumber id="max-traded-input" placeholder='Maximum amount traded' type='number'></InputNumber><br/><br/>
          <InputNumber id="min-sell-input" placeholder='Minimum sell price' type='number'></InputNumber>
          <InputNumber id="max-sell-input" placeholder='Maximum sell price' type='number'></InputNumber><br/><br/>
          <InputNumber id="min-buy-input" placeholder='Minimum buy price' type='number'></InputNumber>
          <InputNumber id="max-buy-input" placeholder='Maximum buy price' type='number'></InputNumber><br/><br/>

          <Select id='order-by' placeholder='Order by' style={{width:'100%'}} options={[
            { value: 'x', label: 'Order by', disabled: true},
            { value: 'Name', label: 'Name'},
            { value: 'SellPrice', label: 'Sell price'},
            { value: 'BuyPrice', label: 'Buy price'},
            { value: 'Profit', label: 'Profit'},
            { value: 'RelProfit', label: 'Relative profit'},
            { value: 'PotProfit', label: 'Potential profit'},
          ]}></Select>

          <Select id='order-dir' placeholder='Order type' style={{width:'100%'}} options={[
            { value: 11, label: 'Order type', disabled: true},
            { value: 1, label: 'Ascending'},
            { value: -1, label: 'Descending'}
          ]}></Select><br/><br/>

          <Button id='search-button' style={{marginTop: '5%'}} onClick={test}>
            Search
          </Button>
      </Sider>
      <Layout className="site-layout" style={{ marginLeft: 200 }}>
        <Content style={{ margin: '24px 16px 0', overflow: 'initial', height: '97vh' }}>
          <Table id='items-table' dataSource={dataSource} columns={columns} pagination={false}></Table>
          <Pagination></Pagination>
        </Content>
      </Layout>
    </Layout>
  </ConfigProvider>
  );
};

export default App;