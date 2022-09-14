import * as dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import path from "node:path";

dotenv.config();
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:true}));

const token_max_age = 300;
const reflesh_when = 15;

function get_expiration(seconds) {
	const since_epoch = Date.now();
	return new Date(since_epoch + seconds * 1000);
}
function create_token(res, user, user_ip, role = "client") {
	const exp_date = get_expiration(token_max_age);
	const rfsh_date = get_expiration(reflesh_when);
	const token = {
		user, role,
		untl: exp_date.toISOString(),
		rfsh: rfsh_date.toISOString(),
		uuip: user_ip
	}
	console.log("auth-token:", token)
	console.log(`until=${exp_date.toString()}, reflesh=${rfsh_date.toString()}`)
	const secret_key = process.env.JWT_SECRET_KEY || "default-secret";
	const cookie = jwt.sign(token, secret_key, {
		expiresIn: token_max_age
	});
	res.cookie("auth-token", cookie, {sameSite: true, maxAge: token_max_age * 1000 });
}
function fetch_token(req, res) {
	const user_ip = req.ip;
	if(req.body && req.body.user) {
		create_token(res, req.body.user, user_ip, req.body.role);
		return true;
	} else {
		res.redirect(401, "/login");
		return false;
	}
}
function reflesh_token(req, res) {
	create_token(res, req.private_data.user, req.private_data.uuip, req.private_data.role);
}
// allow public files under /login/ directory 
export function setupLogin(public_files = path.resolve("public")) {
	const login_files = public_files + "/login"
	console.log(`login files path: ${login_files}`);
	app.use("/login", express.static(login_files));
	// redirect users to login page first
	app.get("/", redirectToLogin);
	// send login.html
	app.get("/login", function(req, res){ 
		res.sendFile(login_files + "/login.html") 
	});
	// create token
	app.post("/login", function(req, res){
		if(fetch_token(req, res)) {
			res.redirect("/session")
		}
	});
	app.use(privateBarrier);
	const private_routes = express.Router();
	app.use("/", private_routes);
	return private_routes;
}

function redirectToLogin(req, res) {
	res.redirect("/login")
}
function privateBarrier(req, res, next) {
	if(req.baseUrl.startsWith("/login")) {
		console.log("[DEBUG] Got a auth request. Forwarding...")
		next();
	}
	const auth_token = req.cookies["auth-token"];
	const secret_key = process.env.JWT_SECRET_KEY || "default-secret";
	console.log();
	console.log(`authetication token: ${auth_token}`);
	// require a token
	if(!auth_token)
		return res.redirect(401, "/login");
	// decrypt the token
	let decrypted;
	try {
		decrypted = jwt.verify(auth_token, secret_key);
	} catch(err) {
		return res.redirect(401, "/login");
	}
	// validate the token and the source ip
	console.log(`Session Data: ip=${decrypted.uuip} user=${decrypted.user} role=${decrypted.role} reflesh="${decrypted.rfsh}"`)
	if(!decrypted || decrypted.uuip != req.ip) 
		return res.redirect(401, "/login");
	
	// get actual time and reflesh time
	const rfsh_date = Date.parse(decrypted.rfsh)
	const now = Date.now();
	console.log(`Reflesh date: "${new Date(rfsh_date).toString()}". Now: "${new Date(now).toString()}"`);
	// push the session data to request
	req.private_data = decrypted
	if(rfsh_date < now) {
		console.log()
		console.log("--- refleshing token ---");
		reflesh_token(req, res);
		// reflesh the token with session data
	}
		
		
	// fowards the request
	next();
}

const private_routes = setupLogin();

private_routes.get("/session", function(req, res){
	res.send(`<h1>Hello ${req.private_data.role} "${req.private_data.user}"<h1>`);
	res.end();
})

const PORT = process.env.LOCAL_PORT || 9001
const HOST = process.env.LOCAL_HOST || "127.0.0.1"
console.log(`Stating at ${HOST}:${PORT}`)
app.listen(PORT, HOST);