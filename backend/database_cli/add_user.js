import sqlite from "sqlite3";
import * as lib from "../database.js";
import libbuffer from "node:buffer";
const logins = new lib.LoginDB(new sqlite.Database("logins_database.db"));
const username = process.argv[2];
const userpass = process.argv[3];
function scape(src) {
	return src.replaceAll("\"", "\\\"")
}
if(username !== undefined && userpass !== undefined) {
	console.log(`Adding user "${scape(username)}" with pass "${scape(userpass)}" to database`);
	const user = libbuffer.Buffer.from(username, "utf-8");
	const pass = libbuffer.Buffer.from(userpass, "utf-8");
	await logins.add(user, pass);
}
