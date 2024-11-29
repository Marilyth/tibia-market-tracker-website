import { TooltipProps } from 'recharts';
import {LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ResponsiveContainer, Tooltip, Brush } from 'recharts';
import { CustomHistoryData, CustomTimeGraph, getWeekday, getWeekdayName } from './data';
// for recharts v2.1 and above
import {
    ValueType,
    NameType,
} from 'recharts/types/component/DefaultTooltipContent';
// for recharts versions below v2.1

export const CustomTooltip = ({
    active,
    payload,
    label,
    formatter,
    contentStyle,
    labelFormatter
}: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
        var tooltipContent: any[] = [];

        payload.forEach((element) => {
            var name = element.name ?? element.dataKey;

            if(name!.toString().includes("Hidden")){
                return;
            }

            tooltipContent.push(
                <p key={element.name} style={{ color: element.stroke }}>
                    {element.name}: {formatter != null ? formatter(element.value!, name!, element, 0, payload) : name}
                </p>
            );
        });

        return (
            <div className="custom-tooltip" style={contentStyle}>
                <div style={{margin: "8px"}}>
                    <p className="label">{labelFormatter != null ? labelFormatter(label, payload) : label}</p>
                    {tooltipContent}
                </div>
            </div>
        );
    }

    return null;
};

var weekdayDateOptions: Intl.DateTimeFormatOptions = {hour12: true, weekday: "short", year: "numeric", month: "short", day: "numeric", hour: '2-digit', minute:'2-digit'};
var dateOptions: Intl.DateTimeFormatOptions = {hour12: true, year: "numeric", month: "short", day: "numeric"};

interface DynamicChartProps {
    timeGraph: CustomTimeGraph;
    isLightMode: boolean;
    animate: boolean;
}

export const DynamicChart = ({timeGraph, isLightMode, animate}: DynamicChartProps) => {
    if (!timeGraph.isWeekdayGraph) {
        var dynamicData: any[] = [];

        // Fill dynamicData with the data from the timeGraph.
        for(var i = 0; i < timeGraph.data.length; i++){
            if(Object.keys(timeGraph.data[i].data).length == 0){
                continue;
            }

            dynamicData.push(timeGraph.data[i].asDynamic());
        }

        // Order the data by time.
        dynamicData = dynamicData.sort((a, b) => a.time - b.time);
        
        var lines: any[] = [];
        // Add a line for every key in the dynamicData except for time and events.
        Object.keys(timeGraph.labels).forEach((key) => {
            if(key != "time" && key != "events" && !key.endsWith("Colour")){
                var colour = timeGraph.colours[key] ?? "#82ca9d";
                var label = timeGraph.labels[key] ?? key;
                var strokeDashArray = key.endsWith("Trend") ? "3 3" : undefined;
                var activeDot = key.endsWith("Trend") ? false : true;
                lines.push(<Line isAnimationActive={animate} connectNulls key={key} name={label} type='monotone' dataKey={key} dot={false} activeDot={activeDot} stroke={colour} strokeDasharray={strokeDashArray} />);
            }
        });
        
        var chart = 
        <ResponsiveContainer width="100%" height={window.innerHeight * 0.4}>
            <LineChart data={dynamicData}>
                <XAxis domain={["dataMin", "dataMax + 1"]} allowDuplicatedCategory={false} type='number' dataKey="time" tickFormatter={(date) => new Date(date * 1000).toLocaleString('en-GB', dateOptions)} />
                <YAxis domain={["dataMin", "dataMax + 1"]} tickFormatter={(value) => value.toFixed(0)} />
                
                <Tooltip content={<CustomTooltip/>} contentStyle={{backgroundColor: isLightMode ? "#FFFFFFBB" : "#141414BB", border: isLightMode ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.5)'}} labelFormatter={(date, payload) => <div>
                                                        {new Date(date * 1000).toLocaleString('en-GB', weekdayDateOptions)}
                                                        <p style={{ color: "#ffb347"}}>{payload[0].payload.events.join(", ")}</p>
                                                   </div>} formatter={(value, name) => value.toLocaleString()}></Tooltip>

                {lines}

                <Brush data={dynamicData} fill={isLightMode ? "#FFFFFF" : "#141414"} dataKey="time" tickFormatter={(date) => new Date(date * 1000).toLocaleString('en-GB', dateOptions)}></Brush>
            </LineChart>
        </ResponsiveContainer>
        
        return chart;
    } else{
        var weekdayData: CustomHistoryData[][] = [[], [], [], [], [], [], []];
        var dynamicData: any[] = [{},{},{},{},{},{},{}];

        // Assign each datapoint to its weekday.
        for(var i = 0; i < timeGraph.data.length; i++){
            if(Object.keys(timeGraph.data[i].data).length == 0){
                continue;
            }
            
            weekdayData[getWeekday(timeGraph.data[i].time)].push(timeGraph.data[i]);
        }

        var bars: any[] = [];
        weekdayData.forEach((weekday, weekdayIndex) => {
            var keyValues: {[valueKey: string]: number[]} = {};

            // Add all values for each key to keyValues.
            weekday.forEach((datapoint) => {
                Object.keys(datapoint.data).forEach(key => {
                    if(key != "time" && key != "events"){
                        if(keyValues[key] == undefined){
                            keyValues[key] = [];
                        }

                        keyValues[key].push(datapoint.data[key]);
                    }
                });
            });

            Object.keys(keyValues).forEach((key) => {
                var sortedValues = keyValues[key].sort((a, b) => a - b);
                var median = sortedValues[Math.floor(sortedValues.length / 2)];
                dynamicData[weekdayIndex][key] = median;
                dynamicData[weekdayIndex]["weekday"] = weekdayIndex;
            });
        });

        // Add a bar for every key in the dynamicData except for weekday.
        Object.keys(timeGraph.labels).forEach((key) => {
            if(key != "weekday" && !key.endsWith("Colour") && !key.endsWith("Trend")){
                var colour = timeGraph.colours[key] ?? "#82ca9d";
                var label = timeGraph.labels[key] ?? key;
                
                bars.push(<Bar isAnimationActive={animate} key={key} name={label} barSize={30} dataKey={key} fill={colour} />);
            }
        });

        var chart = 
        <ResponsiveContainer width='100%' height={window.innerHeight * 0.4}>
            <BarChart data={dynamicData}>
                <XAxis dataKey="weekday" tickFormatter={(day, index) => getWeekdayName(index)}/>
                <YAxis />

                {bars}

                <Tooltip contentStyle={{backgroundColor: isLightMode ? "#FFFFFFBB" : "#141414BB"}} cursor={{fill: '#00000011'}} labelFormatter={(day) => getWeekdayName(day)} formatter={(x) => x.toLocaleString()}></Tooltip>
            </BarChart>
        </ResponsiveContainer>

        return chart;
    }

    return null;
}