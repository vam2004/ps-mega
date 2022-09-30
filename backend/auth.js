import sqlite from "sqlite3";
import libcrypto from "node:crypto";
import libbuffer from "node:buffer";
// errors
export function parseError(error) {
	if(error instanceof CommonDatabaseError)
		return error.constructor.name;
	return "UnknownDatabaseError";
}
export class CommonDatabaseError extends Error {
	constructor(message = "A error was found in database") {
		super(message);
	}
}
export class DatabaseError extends CommonDatabaseError {
	constructor(message = "A error was found while managing the database") {
		super(message);
	}
}
export class UserAlreadyExists extends DatabaseError { 
	constructor(message = "The user already exists") {
		super(message);
	}
}
export class UserNotExists extends DatabaseError {
	constructor(message = "The user does not exists") {
		super(message);
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
export class SQLInternalError extends CommonDatabaseError { 
	constructor(err, message = "A Internal Error was found while fetching the database") {
		super(message);
		this.sql_error = err;
	}
}
export class InvalidGroup extends DatabaseError {
	constructor(message = "Invalid groupname") {
		super(message);
	}
}
export class GroupDoesntMacth extends DatabaseError {
	constructor(message = "The groupname does not match") {
		super(message);
	}
}
export class AtomicError extends SQLInternalError {
	constructor(err, message = "A error was found... rollback done") {
		super(err, message);
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
			//console.log({ query, params});
			params.push(promisefySqlite.error_callback(res, rej));
			operation.call({database, query, params}, []);
		});
	}
	static error_callback(res, rej, allow_this) {
		return function(err, row) {
			//console.log({row, err, _this_: this})
			if(err != null) { 
				rej(new SQLInternalError(err)); 
			} else { 
				res(row, allow_this ? this : undefined); 
			}
		}
	}
}
/*
export class AsyncAtomDatabase {
	constructor(database) {
		this.database = database;
		this.clear();
	}
	atomic_run() {
		const that = this;
		return new Promise(function(res, rej){
			that.database.serialize(function(){
				const database = that.database;
				function next(now){
					walker(now.next);
				}
				function walker(now) {
					console.log({
						query: now.query,
						params: now.params,
						name: now.name,
					});
					if(!now) {
						that.database.run("COMMIT;");
						that.call_sucess();
						that.clear();
						return;
					}
					
					const e = that.run_operation(now, rollback, next, allow_this);
					if(e) {
						that.call_error();
					}
				}
				walker(that.first);
			});
		}) 
	}
	run_operation(operation, next) {
		const create = AsyncAtomDatabase.create_sqlparams;
		const name = operation.name
		const params = create(operation, next, name === "run");
		const simple = ["run", "exec", "get", "each"];
		if(simple.indexOf(name) !== -1) {
			try {
				this.database[name](...params);
			} catch (err) {
				return err;
			}
		}
	}
	run(query, ...params) {
		return this.create_operation("run", query, params);
	}
	exec(query, ...params) {
		return this.create_operation("exec", query, params);
	}
	get(query, ...params) {
		return this.create_operation("get", query, params);
	}
	each(query, ...params) {
		return this.create_operation("each", query, params);
	}
	call_sucess() {
		let operation = first;
		while(operation.next) {
			operation.on_sucess(...arrayfy(operation.result));
			operation = operation.next;
		}
	}
	call_error(error) {
		let operation = this.first;
		while(operation.next) {
			operation.on_error(error);
			operation = operation.next;
		}
	}
	create_operation(name, query, params) {
		const that = this;
		return new Promise(function(on_sucess, on_error){
			const operation = {
				name: "run", query, params, on_sucess, on_error
			};
			const last = that.last;
			last.next = operation;
			that.last = operation;
		});
	}
	clear() {
		this.last = {}
		this.create_operation("run", "BEGIN;", []);
		this.first = this.last;
	}
	static create_sqlparams(operation, rollback, next, allow_this) {
		function res(...params){
			operation.result = params;
			next();
		}
		const handler = promisefySqlite.error_callback(res, () => (), allow_this);
		return [operation.query, ...operation.params, handler];
	}
}*/
function arrayfy(src) {
	return Array.isArray(src) ? src : [src];
}
export function create_unblocker(seconds) {
	return function(user){
		const now = Date.now();
		const last_try = user.last_try.getTime();
		const elapsed = now - last_try
		return elapsed >= seconds * 1000;
	}
}
function Helpers(database, config) {
	const global_salt = config?.global_salt ?? "i'm not secret";
	const hmac_name = config?.innerhasher ?? "sha256";
	const asyncdb = new promisefySqlite(database);
	this.encode_date = config?.date_encoder ?? (time => time.toISOString());
	this.decode_date = config?.date_decoder ?? (time => new Date(time));
	const userblocked = config?.on_userblocked ?? (user => false);
	const MAX_TRIES = config?.max_auth_tries ?? NON_BLOCKING_AUTH;
	
	const decode_date = this.decode_date;
	const encode_date = this.encode_date;
	
	function row_spec(row) {
		this.hashname = row.hashname;
		this.hashpass = row.hashpass;
		this.tries = row.tries;
		this.last_try = decode_date(row.last_try);
		this.config = config;
		//this.__debug__ = row;
		console.log("[DEBUG] fetched user from database:", DebugAux.pretty_row(row));
	}
	row_spec.prototype.pretty = function(){
		return DebugAux.pretty_row(this);
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
		return asyncdb.run(query, hashname);
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
	function ensure_unblocked(chain) {
		return chain.then(function(user) {
			//console.log("Analizing user:", user.pretty());
			if(MAX_TRIES === NON_BLOCKING_AUTH || user.tries < MAX_TRIES) {
				return Promise.resolve(user);
			} else if(userblocked(user)) {
				return clear_tries(user.hashname).then(function(){
					return Promise.resolve(user);
				});
			} else {
				return Promise.reject(new UserIsBlocked());
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
	this.ensure_unblocked = ensure_unblocked;
}
export function ensure_buffer(src) {
	if(typeof src === "string")
		return libbuffer.Buffer.from(src, "utf-8");
	return src;
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
		return DebugAux.unsafe_show_database(database, "main");
	}
	static unsafe_show_database(database, table = "main", _foreach = DebugAux.pretty_row) {
		const asyncdb = new promisefySqlite(database);
		return asyncdb.each(`SELECT * FROM ${table}`, function(err, row){
			if(err != null) { 
				console.log(new SQLInternalError(err)); 
			} else if(row) { 
				console.log(_foreach(row));
			}
		});
	}
	static pretty_row(row) {
		return {
			username: row.hashname.toString(),
			userpass: DebugAux.hex_buffer(row.hashpass),
			last_try: row.last_try,
			tries: row.tries,
			config: row.config,
		}
	}
}

export function LoginDB(database, config) {
	const helpers = new Helpers(database, config);
	const asyncdb = helpers.asyncdb;
	function atomic_auth(hashname, hashpass) {
		let viewname = ensure_buffer(hashname);
		let viewpass = ensure_buffer(hashpass);
		return helpers.ensure_unblocked(helpers.get_user(viewname)).then(function(user){
			if(!helpers.compare_pass(user.hashpass, viewpass)) {
				return helpers.inclease_tries(viewname).then(() => Promise.reject(new InvalidPassword()));
			}
			return Promise.resolve();
		});
	}
	function add(hashname, hashpass, config) {
		const query = "INSERT OR ABORT INTO main VALUES (?, ?, 0, ?, ?)";
		const now = helpers.encode_date(new Date());
		return asyncdb.run(query, hashname, helpers.innerhasher(hashpass), now, config).catch(function(error){
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
			(hashname BLOB PRIMARY KEY, hashpass BLOB, tries INT, last_try STRING, config STRING)`;
		return asyncdb.exec(query);
	}
	this.remove = remove;
	this.add = add;
	this.create_schema = create_schema; 
	this.auth = atomic_auth;
}
export default LoginDB;

/* ======== TESTS ========
*/
const raw_db = new sqlite.Database(':memory:');
async function test_promisefy() {
	const nxt_db = new promisefySqlite(raw_db);
	await nxt_db.exec("CREATE TABLE simple (src STRING, num INT)")
	await nxt_db.exec("INSERT INTO simple VALUES ('hello', 5)")
	await nxt_db.get("SELECT * FROM simple WHERE src = 'hello'")
	console.log(await nxt_db.run("DELETE FROM simple WHERE src = ?", "hello"));
	await nxt_db.exec("CREATE TABLE blobfy (src BLOB)");
	await nxt_db.run("INSERT INTO blobfy VALUES (?)", libbuffer.Buffer.from("hello", "utf-8"))
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
/*async function test_atomicdb() {
	const atomdb = new AsyncAtomDatabase(raw_db);
	atomdb.run("CREATE TABLE atom (name STRING PRIMARY KEY, id INTEGER)");
	atomdb.run("INSERT INTO atom VALUES ('atom-hello-2', 51)");
	atomdb.run("INSERT INTO atom VALUES ('atom-hello-1', 176)");
	atomdb.run("INSERT OR FAIL INTO atom VALUES ('atom-hello-2', 99)");
	atomdb.run("INSERT OR FAIL INTO atom VALUES ('atom-hello-2', 99)");
	await atomdb.atomic_run().catch(console.log);
	await DebugAux.unsafe_show_database(raw_db, "atom", row => row);
}*/
//test_promisefy()
//test_login();
//test_atomicdb();