import { InputNumber, InputNumberProps } from "antd";


export function FormattedNumberInput(props: InputNumberProps) {
    return (
        <InputNumber {...props} formatter={(value) => value ? (+value).toLocaleString() : ""} />
    )
}