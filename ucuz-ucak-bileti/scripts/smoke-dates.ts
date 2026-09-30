import { generateDatePairs } from "../src/lib/dates";
import { buildEnuygunVariants } from "../src/lib/sources/enuygun";

console.log(
  "max1",
  generateDatePairs({
    earliest: "2026-10-20",
    latest: "2026-10-28",
    minStayDays: 3,
    maxStayDays: 7,
    maxPairs: 1,
  }),
);
console.log(
  "max2",
  generateDatePairs({
    earliest: "2026-10-20",
    latest: "2026-10-28",
    minStayDays: 3,
    maxStayDays: 7,
    maxPairs: 2,
  }),
);
console.log("ISTA→AYT", buildEnuygunVariants("ISTA", "AYT"));
console.log("ISTA→AMS", buildEnuygunVariants("ISTA", "AMS"));
console.log("AYT→FRA", buildEnuygunVariants("AYT", "FRA"));
