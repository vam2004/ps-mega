import sqlite from "sqlite3";
import * as lib from "../auth.js";
const logins = new sqlite.Database("logins_database.db");
await lib.DebugAux.show_database(logins);