import jwt from "jsonwebtoken";

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

export function calc_reflesh(reflesh) {
	if (reflesh && reflesh > 0)  {
		const reflesh_date = get_expiration(reflesh);
		console.log(`reflesh=${reflesh_date.toString()}`);
		return reflesh_date.toISOString();
	} else {
		return (reflesh !== 0);
	}
}
export function parse_reflesh(reflesh) {
	if(typeof reflesh === "boolean")
		return reflesh;
	return Date.parse(reflesh);
}
export default function sessions(config, JWT_SECRET = "i'm not secret") {
	const token_max_age = config?.defaults?.token_age ?? sessions.token_max_age;
	const reflesh_after = config?.defaults?.reflesh ?? sessions.reflesh_after;
	if (JWT_SECRET == "i'm not secret")
		console.warn("The key provied is not secret!");
	function update_token(req, res) {
		if(!req.session_data) // no session data
			return true;
		const data = req.session_data
		// validate user's role
		if(!validate_roles(data.groupname)) 
			return true;
		// sanatize the username
		let user = sane_username(data.username ?? "");
		if(!user) // invalid username
			return true;
		// calculates the expiration date
		const maxAge = data.maxAge || token_max_age;
		const reflesh = calc_reflesh(data.reflesh ?? reflesh_after)
		const exp_date = get_expiration(maxAge);
	
		const token = {
			user: user,
			untl: exp_date.toISOString(),
			role: data.groupname,
			uuip: data.adress,
			rfsh: reflesh
		}
		// calculate reflesh date
		
		console.log("auth-token:", token);
		// generate the session cookie
		const cookie = jwt.sign(token, JWT_SECRET, { 
			expiresIn: maxAge 
		});
		res.cookie("auth-token", cookie, {sameSite: true, maxAge: maxAge * 1000 });
	}
	function inject_cookie(req, res) {
		const src_token = req.cookies["auth-token"];
		console.log();
		console.log(`authetication token: ${src_token}`);
		// require a token
		if(!src_token)
			return true;
		// decrypt the token
		let decrypted;
		try {
			decrypted = jwt.verify(src_token, JWT_SECRET);
		} catch(err) {
			return true;
		}
		if(!decrypted)
			return true;
		
		const session_data = {
			username: decrypted.user,
			maxAge: Date.parse(decrypted.untl),
			reflesh: parse_reflesh(decrypted.rfsh),
			groupname: decrypted.role,
			adress: decrypted.uuip,
			config: req.session_data?.config,
		}
		req.session_data = session_data;
		console.log(`reflesh = ${Date(session_data.reflesh)}`);
		console.log(`maxAge = ${Date(session_data.maxAge)}`);
		console.log(session_data);
		return false;
	}
	function ensure_flesh(req, res) {
		const reflesh = req?.session_data?.reflesh;
		if(typeof reflesh === "boolean") {
			if(reflesh)
				return update_token(req, res);
		} else if (reflesh) {
			if(reflesh < now)
				return update_token(req, res);
		}
		return true;
	}
	function inject_flesh(req, res) {
		if(inject_cookie(req, res));
			return true;
		return ensure_flesh(req, res);
	}
	this.ensure_flesh = ensure_flesh;
	this.inject_cookie = inject_cookie;
	this.update_token = update_token;
	this.inject_flesh = inject_flesh;
}
sessions.token_max_age = 300; // seconds (default time)
sessions.reflesh_after = 15; // seconds (default time)