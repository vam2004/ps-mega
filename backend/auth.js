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
export class DebugAux {
	static hex_buffer(buffer) {
		var res = [];
		for(let i = 0; i < buffer.length; i ++) {
			res.push(buffer[i].toString(16).padStart(2, '0'))
		}
		return res.join("");
	}
	static show_database(database) {
		console.log("=========== main table ===========")
		return DebugAux.unsafe_show_database(database, "main", DebugAux.pretty_main_row).then(function(){
			console.log("==================================");
		});
	}
	static unsafe_show_database(database, table = "main", _foreach = (r => r)) {
		const asyncdb = new promisefySqlite(database);
		return asyncdb.each(`SELECT * FROM ${table}`, function(err, row){
			if(err != null) { 
				console.log(new SQLInternalError(err)); 
			} else if(row) { 
				console.log(_foreach(row));
			}
		});
	}
	static pretty_main_row(row) {
		return {
			username: row.hashname.toString(),
			userpass: DebugAux.hex_buffer(row.hashpass),
			last_try: row.last_try,
			tries: row.tries,
			userdata: row.userdata,
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
export function PublicHelpers() {
	function ensure_affected(row) {
		if(row === undefined) {
			return Promise.reject(new UserNotExists());
		}
		return Promise.resolve(row);
	}
	function compare_buffer(s0, s1) {
		const length = s0.length;
		if(length !== s1.length)
			return false;
		for (let i = 0; i < length; i++) {
			if(s0[i] !== s1[i])
				return false;
		}
		return true;
	}
	function catch_userexists(error){
		let handled = error;
		if(error instanceof SQLInternalError && error.sql_error.code === "SQLITE_CONSTRAINT")
			handled = new UserAlreadyExists();
		return Promise.reject(handled);
	}
	return {
		ensure_affected, compare_buffer, 
		catch_userexists
	};
}
function HashsAndDate(config) {
	const global_salt = config?.global_salt ?? "i'm not secret";
	const hmac_name = config?.innerhasher ?? "sha256";
	const encode_date = config?.date_encoder ?? (time => time.toISOString());
	const decode_date = config?.date_decoder ?? (time => new Date(time));
	function innerhasher(data, encoding) {
		const hasher = libcrypto.createHmac(hmac_name, global_salt);
		return hasher.update(data).digest(encoding);
	}
	return {
		encode_date, decode_date, innerhasher
	}
}
function LoginHelpers(database, config) {
	const {
		ensure_affected, compare_buffer, 
		catch_userexists
	} = PublicHelpers();
	const { 
		encode_date, decode_date, innerhasher 
	} = HashsAndDate(config);
	const asyncdb = new promisefySqlite(database);
	const userblocked = config?.on_userblocked ?? (user => false);
	const MAX_TRIES = config?.max_auth_tries ?? NON_BLOCKING_AUTH;
		
	function row_spec(row) {
		this.hashname = row.hashname;
		this.hashpass = row.hashpass;
		this.tries = row.tries;
		this.last_try = decode_date(row.last_try);
		this.config = config;
		//this.__debug__ = row;
		console.log("[DEBUG] fetched user from database:", this.pretty());
	}
	row_spec.prototype.pretty = function(){
		return DebugAux.pretty_main_row(this);
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
		return compare_buffer(localpass, hashpass);
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
	return {
		innerhasher, inclease_tries, clear_tries, 
		compare_pass, get_user, ensure_affected, 
		asyncdb, ensure_unblocked, encode_date, 
		decode_date, catch_userexists
	}
}
export function ensure_buffer(src) {
	if(typeof src === "string")
		return libbuffer.Buffer.from(src, "utf-8");
	return src;
}

const MAIN_TABLE_SCHEMA = `CREATE TABLE IF NOT EXISTS main 
	(hashname BLOB PRIMARY KEY, hashpass BLOB, tries INT, last_try STRING, userdata STRING)`;

export function LoginDB(database, config) {
	const helpers = LoginHelpers(database, config);
	const asyncdb = helpers.asyncdb;
	function atomic_auth(hashname, hashpass) {
		const viewname = ensure_buffer(hashname);
		const viewpass = ensure_buffer(hashpass);
		return helpers.ensure_unblocked(helpers.get_user(viewname)).then(function(user){
			if(!helpers.compare_pass(user.hashpass, viewpass)) {
				return helpers.inclease_tries(viewname).then(() => Promise.reject(new InvalidPassword()));
			}
			return Promise.resolve();
		});
	}
	function add(hashname, hashpass, userdata) {
		const query = "INSERT OR ABORT INTO main VALUES (?, ?, 0, ?, ?)";
		const now = helpers.encode_date(new Date());
		const passwd = helpers.innerhasher(hashpass);
		return asyncdb.run(query, hashname, passwd, now, userdata)
				.catch(helpers.catch_userexists);
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
		return asyncdb.exec(MAIN_TABLE_SCHEMA);
	}
	function change_pass(hashname, hashgroup, oldpass, newpass) {
		const innerhasher = helpers.innerhasher;
		const viewgroup = ensure_buffer(hashgroup); // to-do
		const viewname = ensure_buffer(hashname);
		const viewpass = ensure_buffer(oldpass);
		const newpasswd = innerhasher(ensure_buffer(newpass));
		const oldpasswd = innerhasher(viewpass);
		const query = "UPDATE main SET hashpass = ?3 WHERE hashpass = ?2 AND hashname = ?1"
		return atomic_auth(viewname, viewpass, viewgroup).then(function(){
			return asyndb.run(query, {
				0: viewname, 
				1: oldpasswd, 
				2: newpasswd
			});
		})
	}
	this.remove = remove;
	this.add = add;
	this.create_schema = create_schema; 
	this.auth = atomic_auth;
	this.passwd = change_pass;
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

export function PendingDB(database, config) {
	const hex_buffer = DebugAux.hex_buffer;
	const catch_userexists = PublicHelpers()
							.catch_userexists;
	const {
		encode_date, decode_date, innerhasher
	} = HashsAndDate(config);
	const asyncdb = new promisefySqlite(database);
	function create_schema(cascade) {
		const query = `CREATE TABLE IF NOT EXISTS pending 
			(hashname BLOB NOT NULL, hashgroup BLOB NOT NULL, hashpass BLOB NOT NULL, request_time STRING, lock INTEGER, userdata STRING, UNIQUE(hashname, hashgroup))`;
		return asyncdb.exec(query).then(function(){
			if(cascade)
				return asyncdb.exec(MAIN_TABLE_SCHEMA);
		});
	}
	function accept(hashname, hashgroup) {
		const viewname = ensure_buffer(hashname);
		const viewgroup = ensure_buffer(hashgroup);
		const lockquery = "UPDATE pending SET lock = ? WHERE lock = ? AND hashname = ? AND hashgroup = ?";
		const copyquery = "INSERT INTO main (hashname, hashpass, tries, last_try, userdata) SELECT pending.hashname, pending.hashpass, 0, pending.request_time AS last_try, pending.userdata FROM pending WHERE pending.hashname = ? AND pending.hashgroup = ?";
		const remquery = "DELETE FROM pending WHERE lock = 2 AND hashname = ? AND hashgroup = ?"
		return asyncdb.run(lockquery, 1, 0, viewname, viewgroup).then(function(){
			return asyncdb.run(copyquery, viewname, viewgroup);
		}).then(function(){
			asyncdb.run(lockquery, 2, 1, viewname, viewgroup);
		}).then(function(){
			asyncdb.run(remquery, viewname, viewgroup);
		})
	}
	function row_spec(row) {
		this.hashname = row.hashname;
		this.hashgroup = row.hashgroup;
		this.hashpass = row.hashpass;
		this.request_time = row.request_time;
		this.lock = row.lock;
		this.userdata = row.userdata;
	}
	row_spec.prototype.pretty = function() {
		return {
			name: this.hashname.toString(),
			group: this.hashgroup.toString(),
			time: this.request_time,
			lock: this.lock,
			data: this.userdata
		}
	}
	row_spec.prototype.pretty_leak = function() {
		const pretty = this.pretty();
		pretty.passwd = hex_buffer(this.hashpass);
		return pretty;
	}
	function viewleak() {
		console.log("========== pending table =========")
		return asyncdb.each("SELECT * FROM pending", function(err, row){
			if(err === null) {
				console.log(new row_spec(row).pretty_leak());
			} else {
				console.log(err);
			}
		}).then(function(){
			console.log("==================================")
		});
	}
	function showall() {
		console.log("========== pending table =========")
		return asyncdb.each("SELECT * FROM pending", function(err, row){
			if(err === null) {
				console.log(new row_spec(row).pretty());
			} else {
				console.log(err);
			}
		}).then(function(){
			console.log("==================================")
		});
	}
	function reject(hashname, hashgroup) {
		const viewname = ensure_buffer(hashname);
		const viewgroup = ensure_buffer(hashgroup);
		const query = "DELETE FROM pending WHERE lock = 0 AND hashname = ? AND hashgroup = ?";
		return asyncdb.run(query, viewname, viewgroup);
	}
	function request(hashname, hashgroup, hashpass, userdata) {
		const viewname = ensure_buffer(hashname);
		const viewpass = ensure_buffer(hashpass);
		const viewgroup = ensure_buffer(hashgroup);
		const now = encode_date(new Date());
		const passwd = innerhasher(hashpass);
		const query = "INSERT OR FAIL INTO pending (hashname, hashgroup, hashpass, request_time, lock, userdata) VALUES (?, ?, ?, ?, 0, ?)";
		return asyncdb.run(query, viewname, viewgroup, passwd, now, userdata)
		.catch(catch_userexists);
	}
	return {
		create_schema, request, 
		showall, accept, reject
	}
}
async function test_pending() {
	const requests = PendingDB(raw_db);
	await requests.create_schema(true);
	await requests.request("user", "client", "none", "{}");
	await requests.request("user", "bank", "none", "{}");
	await requests.showall();
	await requests.reject("user", "bank");
	await requests.showall();
	await DebugAux.show_database(raw_db);
	await requests.accept("user", "client");
	await DebugAux.show_database(raw_db);
	await requests.showall();
}
//test_pending();