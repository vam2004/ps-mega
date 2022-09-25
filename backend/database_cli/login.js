import sqlite from "sqlite3";
import * as lib from "../auth.js";
//import libbuffer from "node:buffer";
const logins = new lib.LoginDB(new sqlite.Database("logins_database.db"), {
	max_auth_tries: 3,
	on_userblocked: lib.create_unblocker(10),
});
const username = process.argv[2];
const userpass = process.argv[3];
function scape(src) {
	return src.replaceAll("\"", "\\\"")
}
if(username !== undefined && userpass !== undefined) {
	console.log(`trying to login "${scape(username)}" with password "${scape(userpass)}" to database`);
	//const user = libbuffer.Buffer.from(username, "utf-8");
	//const pass = libbuffer.Buffer.from(username, "utf-8");
	await logins.auth(username, userpass);
}
