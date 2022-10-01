import sqlite from "sqlite3";
import * as lib from "../auth.js";
import readline from "node:readline";

let single_reader;

export function getreader(){
	if(single_reader)
		return single_reader;
	single_reader = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	return single_reader;
}
export function closereader(){
	if(single_reader)
		return single_reader.close();
}
export function stdask(question) {
	return new Promise(function(res, rej){
		getreader().question(question, res);
	});
}
export function scape_quotes(src) {
	if(src === undefined || src === null)
		return src === null ? "[@null]" : "[@undefined]";
	return src.replaceAll("\"", "\\\"")
}
export function auto_scape(auto_scape) {
	if(!auto_scape)
		return (value => value);
	return scape_quotes
}
export function scape_values(keys, values) {
	const tmp = {};
	for(const key of keys) {
		tmp[key] = scape_quotes(values[key]);
	}
	return tmp;
}
export async function getvalues(params){
	const {
		ask, scape, keys
	} = params;
	const handle = auto_scape(scape);
	const length = keys.length;
	let index = 0;
	const tmp = {};
	for(; index < length; index++) {
		const key = keys[index];
		const value = process.argv[index + 2];
		if(value === undefined)
			break;
		tmp[key] = handle(value);
	}
	if(!ask)
		return tmp;
	for(; index < length; index++) {
		const key = keys[index];
		const value = await stdask(key + ": ");
		tmp[key] = handle(value);
	}
	closereader()
	return tmp;
}
export function empty_input(src){
	return src === undefined || src === "";
}

export const requests = new lib.PendingDB(new sqlite.Database("logins_database.db"));
export const parseError = lib.parseError;