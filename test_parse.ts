import { parseGradeLevel, getPromotedClassName } from "./src/dataStore.ts";
console.log(parseGradeLevel("12 RPL"));
console.log(parseGradeLevel("XII RPL"));
console.log(parseGradeLevel("KELAS 12"));
console.log(getPromotedClassName("XII RPL"));
console.log(getPromotedClassName("XI RPL"));
