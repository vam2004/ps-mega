import sqlite from "sqlite3";
import libcrypto from "node:crypto";
import libbuffer from "node:buffer";
// errors
export class DatabaseError extends Error {
	constructor(message = "A error was found while managing the database") {
		super(message)
	}
}
export class UserAlreadyExists extends DatabaseError { 
	constructor(message = "The user already exists") {
		super(message)
	}
}
export class UserNotExists extends DatabaseError {
	constructor(message = "The user does not exists") {
		super(message)
	}
}
export class PasswordExperied extends DatabaseError {
	constructor(message = "The password was expired") {
		super(message);
	}
}
export class UserIsBlocked extends DatabaseError {
	constructor(message = "The user is blocked") {
		super(message);
	}
}

export class InvalidPassword extends DatabaseError {
	constructor(message = "The password does not match") {
		super(message);
	}
}
// internal sql error
export class SQLInternalError extends DatabaseError { 
	constructor(err) {
		super("A Internal Error was found while fetching the database");
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
			this.database.run(this.query, ...this.params);
		}, true);
	}
	each(query, ...params) {
		if(params.length === 0 || typeof params[params.length - 1] !== 'function')
			return Promise.reject(Error("The last argument must be a function"));
		return this.as_callback(query, params, function(){
			this.database.each(this.query, ...this.params);
		});
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
	const global_salt = config?.global_salt ?? "i'm not secret";
	const hmac_name = config?.innerhasher ?? "sha256";
	const asyncdb = new promisefySqlite(database);
	this.encode_date = config?.date_encoder ?? (time => time.toISOString());
	this.decode_date = config?.date_decoder ?? (time => new Date(time));
	this.userblocked = config?.on_userblocked ?? (user => false);
	const MAX_TRIES = config?.max_auth_tries ?? NON_BLOCKING_AUTH;
	
	const decode_date = this.decode_date;
	const encode_date = this.encode_date;
	
	function row_spec(row) {
		this.hashname = row.hashname;
		this.hashpass = row.hashpass;
		this.tries = row.tries;
		this.last_try = decode_date(row.last_try);
		//this.__debug__ = row;
		console.log("[DEBUG] fetched user from database:", row);
	}
	function innerhasher(data, encoding) {
		const hasher = libcrypto.createHmac(hmac_name, global_salt)
		return hasher.update(data).digest(encoding);
	}
	function ensure_affected(row, that) {
		if(row === undefined) {
			return Promise.reject(new UserNotExists())
		}
		return Promise.resolve(row);
	}
	function get_user(hashname) {
		const query = "SELECT * FROM main WHERE hashname = ?";
		return asyncdb.get(query, hashname).then(ensure_affected)
			.then(row => new row_spec(row));
	}
	function inclease_tries(hashname) {
		const now = encode_date(new Date());
		const debug_db = database;
		const query = `UPDATE main SET tries = tries + 1, last_try = ? 
					WHERE hashname = ?`;
		return asyncdb.run(query, now, hashname);
	}
	function clear_tries(hashname) {
		const query = "UPDATE main SET tries = 0 WHERE hashname = ?";
		return asyncdb.exec(query, hashname);
	}
	function compare_pass(localpass, source) {
		const hashpass = innerhasher(source);
		console.log(`[PASSWORD] provided = ${DebugAux.hex_buffer(hashpass)}`);
		console.log(`[PASSWORD] expected = ${DebugAux.hex_buffer(localpass)}`);
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
	this.asyncdb = asyncdb;
}

export class DebugAux {
	static hex_buffer(buffer) {
		var res = [];
		for(let i = 0; i < buffer.length; i ++) {
			res.push(buffer[i].toString(16).padStart(2, '0'))
		}
		return res.join("");
	}
	static show_database(database) {
		const asyncdb = new promisefySqlite(database);
		return asyncdb.each("SELECT * FROM main", function(err, row){
			if(err != null) { 
				console.log(new SQLInternalError(err)); 
			} else if(row) { 
				console.log({
					username: row.hashname.toString(),
					password: DebugAux.hex_buffer(row.hashpass),
					last_try: row.last_try,
					tries: row.tries,
				});
			}
		});
	}
}

export function LoginDB(database, config) {
	const helpers = new Helpers(database, config);
	const asyncdb = helpers.asyncdb;
	function atomic_auth(hashname, hashpass) {
		return helpers.get_user(hashname).then(helpers.ensure_unblocked).then(function(user){
			if(!helpers.compare_pass(user.hashpass, hashpass)) {
				return helpers.inclease_tries(hashname).then(() => Promise.reject(new InvalidPassword()));
			}
			return Promise.resolve();
		});
	}
	function add(hashname, hashpass) {
		const query = "INSERT OR ABORT INTO main VALUES (?, ?, 0, ?)";
		const now = helpers.encode_date(new Date());
		return asyncdb.run(query, hashname, helpers.innerhasher(hashpass), now).catch(function(error){
			var handled = error;
			if(error instanceof SQLInternalError && error.sql_error.code === "SQLITE_CONSTRAINT")
				handled = new UserAlreadyExists();
			return Promise.reject(handled);
		});
	}
	function remove(hashname, hashpass) {
		const query = "DELETE FROM main WHERE hashname = ?";
		const noop = (() => undefined);
		return atomic_auth(hashname, hashpass).then(function(){
			return new Promise(function(res, rej) {
				database.run(query, hashname, function(err, row){
					if(err !== null) {
						rej(new SQLInternalError(err));
					} else if (this.changes < 1) {
						rej(new UserNotExists());
					} else {
						res();
					}
				});
			});
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
	this.auth = atomic_auth;
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
	async function expected_fail(chain, expected) {
		var error = await chain.catch(err => err);
		if(!(error instanceof DatabaseError)){
			console.log(error);
			throw new Error("Assertion Error");
		}
			
		if(error.message !== expected.message) {
			console.log("[ASSERTION] Expected a error:", expected.message);
			console.log("[ASSERTION] But got the error:", error);
			throw new Error("Assertion Error");
		}
	}
	const db = new LoginDB(raw_db, {});
	const name_1 = libbuffer.Buffer.from("hello_123", 'utf8');
	const name_2 = libbuffer.Buffer.from("hello_1234", 'utf8');
	const pass_1 = libbuffer.Buffer.from("pass_123", 'utf8');
	const pass_2 = libbuffer.Buffer.from("pass_1234", 'utf8');
	const asyncdb = new promisefySqlite(raw_db);
	await db.create_schema();
	await db.add(name_1, pass_1);
	await db.add(name_2, pass_1);
	await db.auth(name_1, pass_1);
	await DebugAux.show_database(raw_db);
	await expected_fail(db.auth(name_1, name_2), new InvalidPassword())
	await expected_fail(db.remove(name_1, pass_2), new InvalidPassword());
	await expected_fail(db.add(name_1, pass_2), new UserAlreadyExists());
	await DebugAux.show_database(raw_db);
	await db.remove(name_1, pass_1);
	await expected_fail(db.remove(name_1, pass_1), new UserNotExists());
}
//test_promisefy()
test_login();
