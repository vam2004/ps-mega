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

const rawdb = new sqlite.Database("logins_database.db");
const db = new database.LoginDB(rawdb);
const reqdb = database.PendingDB(rawdb);

// inject the user provided data into request
function injectAnnonymuosData(req, _res){
	const adress = req.ip;
	const groupname = req.body?.role ?? "client";
	const username = req.body?.user;
	const logout = req.body?.force;
	const config = req.session_data?.config;
	const userpass = req.body?.pass;
	req.annonymuos_data = {
		config, logout, userpass, session: {
			username, groupname, adress
		}
	}
}

sessions.sessions.prototype.fetch_token = function(req, res) {
	 // get the password from request
	if(!req.annonymuos_data)
		return Promise.reject(new sessions.AnnonymuosDataNeeded());
	const _session = req.annonymuos_data.session; // get session
	const username = _session.username; // get username
	const groupname = _session.groupname; // get groupname
	const userpass = req.annonymuos_data.userpass; // get password
	/* 
	* The objective is loggin -> session data needed
	* Don't allow the username to be aliased to "" -> username needed
	*/
	if (typeof username !== "string") 
		return Promise.reject(sessions.wrapError(new sessions.InvalidName()));
	// aliasing 'this' under 'that'
	const that = this;
	// do autentication before authorizing
	return db.auth(username, userpass, groupname).then(function(){
		let localerror;
		if(req.session_data)
			return Promise.reject(new sessions.LogoutFirst());
		req.session_data = _session;
		if(localerror = that.update_token(req, res))
			return Promise.reject(localerror);
		return Promise.resolve();
	}).catch(function(err){
		return Promise.reject(sessions.wrapError(err));
	});
}
app.use(function(req, res, next){
	let localerror = sessions_handler.inject_cookie(req, res);;
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
		if(req.session_data)
			res.clearCookie('auth-token');
		return res.redirect("/login");
	});
	return frontend;
}
function can_register_another(basegroup, usergroup){
	const clieve = ["register", "manager", "supervisor"];
	const manager = ["register", "agencie", "client"];
	if(clieve.indexOf(basegroup) === -1)
		return false;
	if(basegroup === "register")
		return usergroup === "client";
	if(basegroup === "manager")
		return manager.indexOf(usergroup) !== -1;
	return basegroup === "supervisor";
}
function nonempty_str(src) {
	return typeof src === "string" && src !== "";
}
async function handle_register(req, res) {
	const body = req.body ?? {};
	const userdata = {
		name: body.name, // nome
		email: body.email, // email
		doc: {
			rg: body.rg, // rg
			cpf: body.cpf, // cpf
			emiter: body.emiter, // org??o emissor
		},
		adress: {
			cep: body.cep,
			street: body.street,
			number: body.number,
			district: body.district,
			compl: body.compl,
		},
		about: {
			work: body.work,
			income: body.income
		}
	}
	const username = body.cpf;
	const userpass = body.userpass;
	const groupname = body.groupname ?? "client";
	const secondpass = body.secondpass;
	
	console.log("Request for registration:", userdata);
	
	const datastr = JSON.stringify(userdata);
	
	if(!nonempty_str(username) || !nonempty_str(userpass))
		return Promise.resolve({ status: "error", message: "Needed a username and password" });
	if(userpass !== secondpass)
		return Promise.resolve({ status: "error", message: "password does not match" });
	return reqdb.request(username, groupname, userpass, datastr)
	.then(function(){
		const basegroup = req.session_data?.groupname;
		if(can_register_another(basegroup, groupname))
			return reqdb.accept(username, "client");
	}).then(function(){
		return { status: "sucess" }
	}).catch(function(err){
		return { status: "error", message: "unknown error" }
	});
}
function parseAuthError(e) {
	console.log(e);
	if(e instanceof sessions.AuthError)
		if(e.auth_error instanceof database.CommonDatabaseError)
			return database.parseError(e.auth_error);
	else if(e instanceof sessions.SessionError)
		return e.constructor.name;
	return "AuthUnknownError";
}
function parseLogin(req, res){
	injectAnnonymuosData(req, res);
	if(req.session_data !== undefined && !req.annonymuos_data?.logout) {
		return Promise.resolve({ status: "warning", action: "logout"});
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
	backend.post("/login", async function(req, res){
		await parseLogin(req, res).then(function(body){
			res.send(body);
		});
	});
	backend.post("/logout", function(req, res){
		if(req.session_data) {
			res.clearCookie('auth-token');
			res.send({ status: "sucess" });
		} else {
			res.send({ status: "no-data"})
		}
	});
	backend.post("/register", async function(req, res){
		await handle_register(req, res).then(function(data){
			res.send(data);
		}).catch(console.log);
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
	return fetch("http://127.0.0.1:9001/fetch/login", {
		method: "POST", 
		headers: { 
			"Content-Type": "application/x-www-form-urlencoded" 
		}, 
		body: `user=${uri_user}&pass=${uri_pass}&role=${uri_role}`
	});
}
*/