import sqlite from "sqlite3";
import libcrypto from "node:crypto";
import libbuffer from "node:buffer";
// errors
export class UserAlreadyExists extends Error { }
export class UserNotExists extends Error { }
export class PasswordExperied extends Error { }
export class UserIsBlocked extends Error { }
export class AuthFailed extends Error { }
// internal sql error
export class SQLInternalError extends Error { 
	constructor(err) {
		this.sql_error = err;
	}
}
// constants 
const NON_BLOCKING_AUTH = -1;
// transform sqlite calls into promises 
export class promisefySqlite {
	constructor(database) {
		this.database = database;
	}
	exec(query, ...params) {
		return this.as_callback(query, params, function(){
			this.database.exec(this.query, ...this.params);
		});
	}
	get(query, ...params) {
		return this.as_callback(query, params, function(){
			this.database.get(this.query, ...this.params);
		});
	}
	run(query, ...params) {
		return this.as_callback(query, params, function(){
			this.database.get(this.query, ...this.params);
		}, true);
	}
	as_callback(query, params, operation, allow_this = false) {
		const database = this.database;
		return new Promise(function(res, rej){
			params.push(function(err, row) {
				//console.log({ query, params, row, err, _this_: this});
				if(err != null) { 
					rej(new SQLInternalError(err)); 
				} else { 
					res(row, allow_this ? this : undefined); 
				}
			});
			operation.call({database, query, params}, []);
		});
	}
}
function Helpers(database, config) {
	function create_hasher(hashername, global_salt) {
	const global_salt = config?.global_salt ?? "i'm not secret";
	const hmac_name = config?.innerhasher ?? "sha256";
	this.encode_date = config?.date_encoder ?? (time => time.toISOString());
	this.decode_date = config?.date_decoder ?? (time => new Date(time));
	this.userblocked = config?.on_userblocked ?? (user => false);
	const MAX_TRIES = config?.max_auth_tries ?? NON_BLOCKING_AUTH;
	
	function innerhasher(data, encoding) {
		const hasher = libcrypto.createHmac(hmac_name, global_salt)
		return hasher.update(data).digest(encoding);
	}
	function ensure_affected(row) {
		if(row === undefined) {
			return Promise.reject(new UserNotExists())
		}
		return Promise.resolve(row);
	}
	function get_user(hashname) {
		const query = "SELECT * FROM main WHERE hashname = ?";
		return asyncdb.get(query, hashname).then(ensure_affected)
			.then(row => new UserRow(row, decode_date));
	}
	function inclease_tries(hashname) {
		const now = encode_date(new Date());
		const query = "UPDATE main SET tries = tries + 1, last_try = ? WHERE username = ?";
		return asyncdb.exec(query, now, hashname);
	}
	function clear_tries(hashname) {
		const query = "UPDATE main SET tries = 0 WHERE username = ?";
		return asyncdb.exec(query, hashname);
	}
	function compare_pass(localpass, source) {
		const hashpass = innerhasher(source);
		const length = localpass.length;
		if(length !== hashpass.length)
			return false;
		for (let i = 0; i < length; i++) {
			if(hashpass[i] !== localpass[i])
				return false;
		}
		return true;
	}
	function ensure_unblocked(user) {
		console.log("Analizing user:", user);
		return new Promise(function(res, rej) {
			if(MAX_TRIES === NON_BLOCKING_AUTH || user.tries < MAX_TRIES) {
				res(user);
			} else if(userblocked(user)) {
				clear_tries(user.hashname).then(res);
			} else {
				rej(new UserIsBlocked());
			} 
		});
	}
	this.innerhasher = innerhasher;
	this.inclease_tries = inclease_tries;
	this.clear_tries = clear_tries;
	this.compare_pass = compare_pass;
	this.get_user = get_user;
	this.ensure_affected = ensure_affected;
}


export function LoginDB(database, config) {
	const asyncdb = new promisefySqlite(database);
	const helpers = new Helpers();
	function atomic_auth(hashname, hashpass) {
		get_user(hashname).then(helpers.ensure_unblocked).then(function(user){
			if(!cmp_pass(user.hashpass, hashpass)) {
				return inclease_tries().then(() => Promise.reject(new AuthFailed()));
			}
			return Promise.resolve();
		});
	}
	function add(hashname, hashpass) {
		const query = "INSERT OR ABORT INTO main VALUES (?, ?, 0, ?)";
		const now = encode_date(new Date());
		return asyncdb.run(query, hashname, helpers.innerhasher(hashpass), now);
	}
	function remove(hashname, hashpass) {
		const query = "DELETE FROM main WHERE main.hashname = ?";
		return auth(hashname, hashpass).then(function(){
			return asyncdb.get(query, hashname).then(helpers.ensure_affected);
		})
	}
	function create_schema() {
		const query = `CREATE TABLE IF NOT EXISTS main 
			(hashname BLOB PRIMARY KEY, hashpass BLOB, tries INT, last_try STRING)`;
		return asyncdb.exec(query);
	}
	this.remove = remove;
	this.add = add;
	this.create_schema = create_schema; 
	this.atomic_auth = atomic_auth;
}



const raw_db = new sqlite.Database(':memory:');

async function test_promisefy() {
	const nxt_db = new promisefySqlite(raw_db);
	await nxt_db.exec("CREATE TABLE simple (src STRING, num INT)")
	await nxt_db.exec("INSERT INTO simple VALUES ('hello', 5)")
	await nxt_db.get("SELECT * FROM simple WHERE src = 'hello'")
	console.log(await nxt_db.get("DELETE FROM main WHERE src = ? LIMIT BY 1", "hello"));
	await nxt_db.exec("CREATE TABLE blobfy (src BLOB)");
	await nxt_db.run("INSERT INTO blobfy VALUES (?)", new libbufer.Blob(["hello"]))
	await nxt_db.get("SELECT * FROM blobfy");
}
async function test_login() {
	const db = new LoginDB(raw_db, {});
	const hashname = libbuffer.Buffer.from("hello_123", 'utf8');
	const hashpass = libbuffer.Buffer.from("pass_123", 'utf8');
	await db.create_schema();
	await db.add(hashname, hashpass);
	await db.atomic_auth(hashname, hashpass);
	db.atomic_auth(hashname, libbuffer.Buffer.from("pass_123", 'utf8'))
}
//test_promisefy()
test_login();
