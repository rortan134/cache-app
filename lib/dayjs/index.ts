// biome-ignore lint/style/noExportedImports: intentional
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import timeZone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import updateLocale from "dayjs/plugin/updateLocale";
import utc from "dayjs/plugin/utc";

dayjs.extend(isBetween);
dayjs.extend(isToday);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(timeZone);
dayjs.extend(toArray);
dayjs.extend(updateLocale);
dayjs.extend(utc);

dayjs.updateLocale("en", {
    relativeTime: {
        d: "1d",
        dd: "%dd",
        future: "in %s",
        h: "1h",
        hh: "%dh",
        M: "1mo",
        MM: "%dmo",
        m: "1m",
        mm: "%dm",
        past: "%s ago",
        s: "1s",
        y: "1y",
        yy: "%dy",
    },
});

export type Dayjs = dayjs.Dayjs;
export type { ConfigType } from "dayjs";
export { dayjs };
