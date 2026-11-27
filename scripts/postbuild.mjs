import { globSync } from "glob";
import { unlinkSync } from "fs";

for (const pattern of ["./build/**/*.d.ts", "./build/**/*.map", "./build/**/*.tsbuildinfo"]) {
  for (const modulePath of globSync(pattern)) {
    console.log(modulePath);
    unlinkSync(modulePath);
  }
}
