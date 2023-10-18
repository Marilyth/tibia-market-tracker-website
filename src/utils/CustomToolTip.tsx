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
    console.log(payload);
    if (active && payload && payload.length) {

        return (
            <div className="custom-tooltip" style={contentStyle}>
            
            </div>
        );
    }

    return null;
};