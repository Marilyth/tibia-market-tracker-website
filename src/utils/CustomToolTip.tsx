import { TooltipProps } from 'recharts';
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