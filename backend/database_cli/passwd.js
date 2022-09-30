import sqlite from "sqlite3";
import * as lib from "../auth.js";
//import libbuffer from "node:buffer";
const logins = new lib.LoginDB(new sqlite.Database("logins_database.db"), {
	max_auth_tries: 3,
	on_userblocked: lib.create_unblocker(10),
});
const username = process.argv[2];
const userpass = process.argv[3];
const nextpass = process.argv[4];
function scape(src) {
	return src.replaceAll("\"", "\\\"")
}
if(username !== undefined && userpass !== undefined) {
	console.log(`changing password of the user "${scape(username)}" from "${scape(userpass)}" to ${scape(nextpass)}`);
	//const user = libbuffer.Buffer.from(username, "utf-8");
	//const pass = libbuffer.Buffer.from(username, "utf-8");
	await logins.passwd(username, userpass, nextpass);
}
