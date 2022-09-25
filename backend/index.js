import * as dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "node:path";
import sqlite from "sqlite3";
import * as database from "./database.js";
import express from "./private_router.js";
import * as sessions from "./sessions.js";
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

const db = new database.LoginDB(new sqlite.Database("logins_database.db"));



sessions.sessions.prototype.fetch_token = function(req, res) {
	/*if(req.session_data)
		return new LogoutFirst();*/
	const adress = req.ip;
	const groupname = req.body?.role ?? "client";
	const username = req.body?.user;
	const userpass = req.body?.pass;
	const config = req.session_data?.config;
	const that = this;
	return db.auth(username, userpass).then(function(){
		let localerror;
		req.session_data = {
			username, groupname, adress, config
		}
		if(localerror = that.update_token(req, res))
			return Promise.reject(localerror);
		return Promise.resolve();
	}).catch(function(err){
		return Promise.reject(new sessions.AuthError(err));
	});
}
app.use(function(req, res, next){
	let localerror;
	if(localerror = sessions_handler.inject_flesh(req, res)) {
		console.log("Cannot Inject Token:", localerror.message);
	};
	next();
});
const sessions_handler = new sessions.sessions({
	defaults: {
		reflesh: true,
	}
});



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
		if(req.session_data !== undefined) {
			res.redirect("/redirecting");
		} else {
			res.sendFile(login_files + "/login.html");
		}
	});
	// authetication
	app.post("/login", function(req, res){
		if(req.session_data !== undefined) {
			res.redirect("/redirecting");
		} else {
			return sessions_handler.fetch_token(req, res).then(function(){
				res.redirect("/session");
			}).catch(function(err){
				console.log("Cannot do login:", err.message);
				res.redirect("/invalid");
			});
		}
	});
}

setupLogin(path.resolve("public"));

const private_routes = app.acess_control();


private_routes.get("/session", function(req, res){
	res.send(`<h1>Hello ${req.session_data.groupname} "${req.session_data.username}"<h1>`);
	res.end();
})

const PORT = process.env.LOCAL_PORT || 9001
const HOST = process.env.LOCAL_HOST || "127.0.0.1"
console.log(`Stating at ${HOST}:${PORT}`)
app.listen(PORT, HOST);
/*
function login(user, pass, role = "client") {
	const uri_pass = encodeURI(pass);
	const uri_user = encodeURI(user);
	const uri_role = encodeURI(role);
	fetch("/login", {
		method: "POST", 
		headers: { 
			"Content-Type": "application/x-www-form-urlencoded" 
		}, 
		body: `user=${uri_pass}&pass=${uri_user}&role=${uri_role}`
	});
}
*/