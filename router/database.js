import sqlite from "sqlite3";
class LoginDB() {
	/**
	* @typedef {object} LoginDatabaseConfig
	* @prop {boolean} single_use_salt - defines if a single-use salt should be used
	* @prop {(Buffer) => Buffer} default_hasher - defines the hasher used with user and pass
	*/
	
	/**
	* @param {LoginDatabaseConfig} config
	*/
	constructor(database, config){
		
	}
	/**
	* Adds a client to database if not exist, otherwise throws UserAlreadyExists();
	* @param {Buffer} hashname
	* @param {Buffer} hashpass
	* @returns {void}
	*/
	add(hashname, hashpass) {
		
	}
	/**
	* Auth and Remove a client from database if exists, otherwise throws UserNotExists() or AuthError()
	* @param {Buffer} hashname
	* @param {Buffer} hashpass
	* @returns {void}
	*/
	remove(hahsname, hashpass) {
		
	}
	/**
	* Compare the hashs if user exists, isn't blocked 
	* and if the passphase still valid.
	* Otherwise throws UserNotExists(), PasswordExperied() or UserIsBlocked().
	* Afected 
	* @param {Buffer} hashname
	* @param {Buffer} hashpass
	* @returns {boolean}
	*/
	auth(hashname, hashpass) {
		
	}
	/**
	* Require a lock for the auth session or trow LockedAuthSession if fails. 
	* Return a new generated salt  if the single_use_salt is setted, otherwise null.
	* @param {Buffer} hashname
	* @param {Date} expiration
	* @returns {Buffer | null}
	*/
	lock_auth(hashname, expiration) {
		
	}
}