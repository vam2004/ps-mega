import sqlite from "sqlite3";
import * as lib from "../auth.js";

const requests = new lib.PendingDB(new sqlite.Database("logins_database.db"));
const cascade = process.argv[2] ? true : false;

console.log(`Creating the schematic of "pending" table. Cascade: ${cascade}`);
await requests.create_schema(cascade);

