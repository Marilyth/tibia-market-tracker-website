
export function unixTimeToTimeAgo(unixTime: number) {
    // If unixTime is seconds, convert to milliseconds
    if (unixTime < 10000000000) {
        unixTime *= 1000;
    }

    const now = new Date().getTime();
    const diff = now - unixTime;
    console.log(unixTime, now, diff);

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 48) {
        return `${Math.floor(hours / 24)} days ago`;
    }

    if (hours > 0) {
        return `${hours} hours ago`;
    }

    if (minutes > 0) {
        return `${minutes} minutes ago`;
    }

    return `${seconds} seconds ago`;
}

interface TimestampProps {
    relative?: boolean;
    weekFormat?: boolean;
    timestamp: number;
}

export const Timestamp = ({relative, weekFormat, timestamp}: TimestampProps) => {
    if(timestamp == 0)
        return null;

    if(timestamp < 10000000000){
        timestamp *= 1000;
    }

    var text = "";
    var dateTime = new Date(timestamp * 1000);

    if (relative){
        text = `Updated ${unixTimeToTimeAgo(timestamp)}`;
    }
    else if(!weekFormat){
        text = dateTime.toLocaleString('en-GB', {hour12: true, year: "numeric", month: "short", day: "numeric"});
    } else {
        text = dateTime.toLocaleString('en-GB', {hour12: true, weekday: "short", year: "numeric", month: "short", day: "numeric", hour: '2-digit', minute:'2-digit'});
    }

    return <div style={{textAlign: 'center', color: 'grey', marginTop: 12}}>{text}</div>
}