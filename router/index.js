import * as dotenv from "dotenv";
import express from "private_router.js";
import cookieParser from "cookie-parser";
import sessions from "sessions.js";
import path from "node:path";
// inject the envoriment variables
dotenv.config();
// create the main router
const app = express();
// parses application/json
app.use(express.json());
// parses cookie header
app.use(cookieParser());
// parse application/x-www-urlencoded-form
app.use(express.urlencoded({extended:true}));

sessions.prototype.fetch_token = function(req, res) {
	const source_adress = req.ip;
	const groupname = req.body?.role ?? "client";
	const username = req.body?.user;
	const config = req.session_data?.config;
	req.session_data = {
		username, groupname, source_adress, config,
	}
	if(this.update_token(req, res)) {
		res.redirect(401, "/login");
		return true;
	}
	return false;
}

const sessions_handler = new sessions();

app.use(sessions_handler.inject_cookie);

// homepage is login when user is not already logged in
app.get("/", function(req, res){
	if(!req.session_data) {
		res.redirect("/login");
	} else {
		res.redirect("/session");
	}
});

const default_login_files = path.resolve("public");

export function setupLogin(public_files = default_login_files) {
	const login_files = public_files + "/login"
	console.log(`login files path: ${login_files}`);
	app.use("/login", express.static(login_files));
	// send "login.html"
	app.get("/login", function(req, res){ 
		res.sendFile(login_files + "/login.html") 
	});
	// authetication
	app.post("/login", function(req, res){
		if(!sessions_handler.fetch_token(req, res)) {
			res.redirect("/session");
		} else {
			res.redirect("/invalid");
		}
	});
}

setupLogin(path.resolve("public"));

const private_routes = app.acess_control();

console.log(private_routes);

private_routes.get("/session", function(req, res){
	res.send(`<h1>Hello ${req.session_data.groupname} "${req.session_data.username}"<h1>`);
	res.end();
})

const PORT = process.env.LOCAL_PORT || 9001
const HOST = process.env.LOCAL_HOST || "127.0.0.1"
console.log(`Stating at ${HOST}:${PORT}`)
app.listen(PORT, HOST);