import sqlite from "sqlite3";
import libcrypto from "node:crypto";
import libbuffer from "node:buffer";
class UserAlreadyExists extends Error { }
class UserNotExists extends Error { }
class PasswordExperied extends Error { }
class UserIsBlocked extends Error { }
class AuthFailed extends Error { }

class SQLInternalError extends Error { 
	constructor(err) {
		this.sql_error = err;
	}
}


class UserRow {
	constructor(row, date_decoder) {
		this.hashname = row.hashname;
		this.hashpass = row.hashpass;
		this.tries = row.tries;
		this.last_try = date_decoder(row.last_try);
		this.__rows__ = row
	}
}

class promisefySqlite {
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
				console.log({ query, params, row, err, _this_: this});
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

const NON_BLOCKING_AUTH = -1;

function create_hasher(hashername, global_salt) {
	return function (data, encoding){
		const hasher = libcrypto.createHmac(hashername, global_salt)
		return hasher.update(data).digest(encoding);
	}
}
function LoginDB(database, config) {
	const encode_date = config?.date_encoder ?? (time => time.toISOString());
	const decode_date = config?.date_decoder ?? (time => new Date(time));
	const global_salt = config?.global_salt ?? "i'm not secret";
	const MAX_TRIES = config?.max_auth_tries ?? NON_BLOCKING_AUTH;
	const innerhasher = create_hasher(config?.innerhasher ?? "sha256", global_salt);
	const on_userblocked = config?.on_userblocked ?? (user => false);
	const asyncdb = new promisefySqlite(database);
	
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
	function cmp_pass(localpass, source) {
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
	function atomic_auth(hashname, hashpass) {
		get_user(hashname).then(function(user){
			console.log("Auth:", user.__rows__)
			const unblocked = new Promise(function(res, rej) {
				if(MAX_TRIES === NON_BLOCKING_AUTH || user.tries < MAX_TRIES) {
					res();
				} else if(on_userblocked(user)) {
					clear_tries(hashname).then(res);
				} else {
					rej(new UserIsBlocked());
				} 
			});
			return unblocked.then(function(){
				if(!cmp_pass(user.hashpass, hashpass)) {
					return inclease_tries().then(() => Promise.reject(new AuthFailed()));
				}
				return Promise.resolve();
			});
		});
	}
	/**
	* Adds a client to database if not exist, otherwise throws UserAlreadyExists();
	* @param {Buffer} hashname
	* @param {Buffer} hashpass
	* @returns {void}
	*/
	function add(hashname, hashpass) {
		const query = "INSERT OR ABORT INTO main VALUES (?, ?, 0, ?)";
		const now = encode_date(new Date());
		return asyncdb.run(query, hashname, innerhasher(hashpass), now);
	}
	/**
	* Auth and Remove a client from database if exists, otherwise rejects with UserNotExists() or AuthError()
	* @param {Buffer} hashname
	* @param {Buffer} hashpass
	* @returns {Promise<void>}
	*/
	function remove(hashname, hashpass) {
		const query = "DELETE FROM main WHERE main.hashname = ?";
		return auth(hashname, hashpass).then(function(){
			return asyncdb.get(query, hashname).then(ensure_affected);
		})
	}
	/**
	* Compare the hashs if user exists, isn't blocked 
	* and if the passphase still valid.
	* Otherwise rejects with UserNotExists(), PasswordExperied() or UserIsBlocked().
	* Afected 
	* @param {Buffer} hashname
	* @param {Buffer} hashpass
	* @returns {Promise<void>}
	*/
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
}
//test_promisefy()
test_login();
