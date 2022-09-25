import sqlite from "sqlite3";
import * as lib from "../database.js";
const logins = new lib.LoginDB(new sqlite.Database("logins_database.db"));
await logins.create_schema();