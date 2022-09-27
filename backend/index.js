import * as dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "node:path";
import sqlite from "sqlite3";
import * as database from "./auth.js";
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


function injectAnnonymuosData(req, res){
	const adress = req.ip;
	const groupname = req.body?.role ?? "client";
	const username = req.body?.user;
	const logout = req.body?.force;
	const config = req.session_data?.config;
	req.annonymuos_data = {
		config, logout, session: {
			username, groupname, adress
		}
	}
}
export class AnnonymuosDataNeeded extends Error {
	constructor() {
		super("req.session is undefined")
	}
}
sessions.sessions.prototype.fetch_token = function(req, res) {
	const userpass = req.body?.pass;
	if(!req.annonymuos_data?.session)
		return Promise.reject(AnnonymuosDataNeeded());
	const session = req.annonymuos_data?.session;
	const that = this;
	return db.auth(session.username, userpass, session.groupname).then(function(){
		let localerror;
		req.session_data = session;
		if(localerror = that.update_token(req, res))
			return Promise.reject(localerror);
		return Promise.resolve();
	}).catch(function(err){
		return Promise.reject(sessions.wrapError(err));
	});
}
app.use(function(req, res, next){
	let localerror;
	if(req.path.startsWith("/login")) {
		sessions_handler.inject_cookie(req, res);
	} else {
		localerror = sessions_handler.inject_flesh(req, res)
	} 
	if(localerror) {
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


function setup_frontend() {
	const pwd = path.resolve("public/login"); 
	const frontend = express.Router();
	frontend.get("/", function(req, res){
		if(!req.session_data) {
			res.redirect("/login");
		} else {
			res.redirect("/login/logged");
		}
	});
	// static files
	frontend.use("/login", express.static(pwd));
	// send static "/login"
	frontend.get("/login", function(req, res){ 
		if(req.session_data !== undefined) {
			res.redirect("/logged");
		} else {
			res.sendFile(pwd + "/login.html");
		}
	});
	// authetication
	frontend.post("/login", async function(req, res){
		const parsed = await parseLogin(req, res);
		if(parsed.status === "sucess")
			return res.redirect("/home");
		if(parsed.status === "warning" && parsed.action === "logout")
			return res.redirect("/logged");
		if(parsed.status === "error")
			return res.redirect(`/login?error=${parsed.error}`);
		res.redirect("/login?error=unknown")
	});
	frontend.post("/logout", function(req, res){
		res.clearCookie('auth-token');
		return res.send({ action: "sucess" });
	});
	frontend.get("/logout", function(req, res){
		res.clearCookie('auth-token');
		return res.redirect("/login");
	});
	return frontend;
}
function parseAuthError(e) {
	console.log(e);
	if(e instanceof sessions.AuthError)
		return database.parseError(e.auth_error);
	if(e instanceof sessions.SessionError)
		return e.constructor.name;
	return "AuthUnknownError";
}
function parseLogin(req, res){
	injectAnnonymuosData(req, res);
	if(req.session_data !== undefined && !req.annonymuos_data?.logout) {
		return { status: "warning", action: "logout"};
	} 
	return sessions_handler.fetch_token(req, res).then(function(){
		return { status: "sucess" };
	}).catch(function(e){
		const logged = req.session_data ? true : false;
		const error = parseAuthError(e);
		return { status: "error", error, logged};
	});
}
function setup_backend() {
	const backend = express.Router();
	backend.post("/login", function(req, res){
		res.send(parseLogin(req, res));
	});
	backend.post("/logout", function(req, res){
		res.clearCookie('auth-token');
		return res.send({ action: "sucess" });
	});
	return backend;
}
app.use(setup_frontend());
app.use("/fetch", setup_backend());
const private_routes = app.acess_control();


private_routes.get("/home", function(req, res){
	res.send(
`<html>
	<head>
		<meta charset="utf-8"/>
	</head>
	<body style="background-color: black; color: white;">
		<h1>Hello ${req.session_data.groupname} "${req.session_data.username}"</h1>
		<a href="/logout" style="font-size: 3em">logout</a>
	</body>
</html>`);
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