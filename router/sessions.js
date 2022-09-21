import jwt from "jsonwebtoken";

export function get_expiration(seconds) {
	const since_epoch = Date.now();
	return since_epoch + seconds * 1000;
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
export function sane_client_id(user) {
	// valid CPF spec: "xxx.xxx.xxx-yy"
	// valid CPNJ spec: "xx.xxx.xxx/yyy-zz"
	// https://pt.wikipedia.org/wiki/Cadastro_Nacional_da_Pessoa_Jur%C3%ADdica
	// https://pt.wikipedia.org/wiki/Cadastro_de_Pessoas_F%C3%ADsicas
	return 0;
}
export function sane_html(src) {
	return src.replaceAll(">", "&gt").replaceAll("<", "&lt");
}
export function sane_username(src, user_role) {
	if(user_role == "client")
		return sane_client_id(src);
	return sane_html(src);
}

export function calc_reflesh(source) {
	if(typeof source === "boolean")
		return source;
	if (source > 0)  {
		const reflesh = get_expiration(source);
		console.log(`reflesh=${new Date(reflesh).toString()}`);
		return reflesh;
	}
	return (source !== 0);
}
export class SessionError extends Error {
	constructor(message = "General Session Error") {
		super(message)
	}
}
export class InvalidGroup extends SessionError {
	constructor(message = "Invalid groupname provided") {
		super(message)
	}
}
export class InvalidName extends SessionError {
	constructor(message = "Invalid username provided") {
		super(message)
	}
}
export class InvalidToken extends SessionError {
	constructor(message = "A invalid Session Token was found") {
		super(message);
	}
}
export class SignatureError extends InvalidToken {
	constructor(message = "Session Token was not a valid signature") {
		super(message);
	}
}
export class TokenExpired extends SessionError {
	constructor(message = "Session Token was already expired") {
		super(message);
	}
}
export class TokenNeeded extends SessionError {
	constructor(message = "Is required a Session Token") {
		super(message);
	}
}

export function sessions(config, JWT_SECRET = "i'm not secret") {
	const token_max_age = config?.defaults?.token_age ?? sessions.token_max_age;
	const reflesh_after = config?.defaults?.reflesh ?? sessions.reflesh_after;
	console.log(`[DEFAULTS] token_max_age = ${token_max_age}`);
	console.log(`[DEFAULTS] reflesh_after = ${reflesh_after}`);
	if (JWT_SECRET == "i'm not secret")
		console.warn("The key provied is not secret!");
	function update_token(req, res) {
		let localerror;
		if(localerror = sanatize_token(req, res))
			return localerror;
		const data = req.session_data;
		const token = {
			user: data.username,
			untl: data.maxAge,
			role: data.groupname,
			uuip: data.adress,
			rfsh: data.reflesh
		}
		// calculate reflesh date
		
		console.log("auth-token:", token);
		// generate the session cookie
		const cookie = jwt.sign(token, JWT_SECRET, { 
			expiresIn: token_max_age 
		});
		res.cookie("auth-token", cookie, {sameSite: true, maxAge: token_max_age * 1000 });
	}
	function sanatize_token(req, res) {
		console.log("Request:", req)
		if(!req.session_data) // no session data
			return new TokenNeeded();
		console.log("session data:", req.session_data);
		const data = req.session_data
		// validate user's role
		if(!validate_roles(data.groupname)) 
			return new InvalidGroup();
		// sanatize the username
		let username = sane_username(data.username ?? "");
		if(!username) // invalid username
			return new InvalidName();
		// calculates the expiration date
		data.maxAge = get_expiration(token_max_age);
		data.reflesh = data.reflesh ?? calc_reflesh(reflesh_after);
		data.username = username;
	}
	function inject_cookie(req, res) {
		const src_token = req.cookies["auth-token"];
		console.log();
		console.log(`authetication token: ${src_token}`);
		// require a token
		if(!src_token)
			return new TokenNeeded();
		// decrypt the token
		let decrypted;
		try {
			decrypted = jwt.verify(src_token, JWT_SECRET);
		} catch(err) {
			return new SignatureError();
		}
		if(typeof decrypted !== "object")
			return new InvalidToken();
		if(decrypted.maxAge < Date.now())
			return new TokenExpired();
		const session_data = {
			username: decrypted.user,
			maxAge: decrypted.untl,
			reflesh: decrypted.rfsh,
			groupname: decrypted.role,
			adress: decrypted.uuip,
			config: req.session_data?.config,
		}
		req.session_data = session_data;
		console.log(`reflesh = ${Date(session_data.reflesh)}`);
		console.log(`maxAge = ${Date(session_data.maxAge)}`);
		console.log(session_data);
	}
	function ensure_flesh(req, res) {
		const reflesh = req?.session_data?.reflesh;
		const now = Date.now();
		if(typeof reflesh === "boolean") {
			if(reflesh)
				return update_token(req, res);
		} else if (reflesh) {
			if(reflesh < now)
				return update_token(req, res);
		}
		//return new SessionError(); 
		return Error("invalid reflesh");
	}
	function inject_flesh(req, res) {
		let localerror;
		if(localerror = inject_cookie(req, res)) 
			return localerror;
		return ensure_flesh(req, res);
	}
	this.ensure_flesh = ensure_flesh;
	this.inject_cookie = inject_cookie;
	this.update_token = update_token;
	this.inject_flesh = inject_flesh;
}
sessions.token_max_age = 300; // seconds (default time)
sessions.reflesh_after = 15; // seconds (default time)
export default sessions;