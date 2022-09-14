import * as dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
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

// redirect / to /login
app.get("/", redirectToLogin);
// deny acess to private resources
app.use(privateBarrier);

export function get_expiration(seconds) {
	const since_epoch = Date.now();
	return new Date(since_epoch + seconds * 1000);
}
export function validate_roles(role) {
	const user_roles = ["client", "agencie", "manager", "supervisor", "bank"];
	return user_roles.indexOf(role) !== -1;
}
/** 
*   validates and parse client CPF/CNPJ return it as number
* 	@param {string} user
*	@return {{ client_type: "CPF" | "CPNJ", value: number} | undefined}
*/
export function parse_client(user) {
	// valid CPF spec: "xxx.xxx.xxx-yy"
	// valid CPNJ spec: "xx.xxx.xxx/yyy-zz"
	// https://pt.wikipedia.org/wiki/Cadastro_Nacional_da_Pessoa_Jur%C3%ADdica
	// https://pt.wikipedia.org/wiki/Cadastro_de_Pessoas_F%C3%ADsicas
	return 0;
}
export function sane_html(src) {
	return src.replaceAll("<", "&gt").replaceAll(">", "&lt");
}
class TokenFactory {
	static token_max_age = 300; // seconds (default time)
	static reflesh_after = 15; // seconds (default time)
	
	
	create_token(res, data, role = "client") {
		// validate user's role
		if(!validate_roles(role)) 
			return true;
		// parse the user
		let user = sane_html(data.user ?? "");
		if(role == "client") {
			user = parse_client(user);
		}
		// validate the user
		if(user === undefined)
			return true;
		// calculates the expiration date
		const maxAge = data.maxAge || TokenFactory.token_max_age
		const exp_date = get_expiration(maxAge);
	
		const token = {
			user: user,
			//untl: exp_date.toISOString()
			role: role,
			uuip: data.uuip,
		}
		// calculate reflesh date
		if (data.reflesh && data.reflesh > 0)  {
			const rfsh_date = = get_expiration(data.reflesh);
			token.rfsh = rfsh_date.toISOString();
			console.log(`reflesh=${rfsh_date.toString()}`);
		} else {
			token.rfsh = (data.reflesh !== 0);
		}
		console.log("auth-token:", token);
		// generate the session cookie
		const secret_key = process.env.JWT_SECRET_KEY || "default-secret";
		const cookie = jwt.sign(token, secret_key, { expiresIn: maxAge });
		res.cookie("auth-token", cookie, {sameSite: true, maxAge: maxAge * 1000 });
	}
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