import express from "express";
express.application.acess_control = acess_control;
express.Router.acess_control = acess_control;
express.group_wrapper = group_wrapper;

function acess_control (group) {
	// this is require("./express/application")
	if(!this.private_routers)
		this.private_routers = {
			groups: new Map();
		}
	const private_routers = this.private_routers;
	if(typeof group === "string") {
		let group_handler = private_routers.groups.get(group);
		if(!group_handler) {
			group_handler = express.Router();
			this.use(function(req, res, next) {
				if(req.session_data && req.session_data.group_name === group) {
					group_handler.handle(req, res, next);
				} else {
					next();
				}
			});
		}
		return group_handler;
	}
	if(!private_routers.general) {
		const general_handler = express.Router();
		this.use(this.use(function(req, res, next) {
			if(req.session_data && req.session_data.group_name) {
				general_handler.handle(req, res, next);
			} else {
				next();
			}
		});
	}
	return private_routers.general;
}
export function group_wrapper(callback, groups) {
	if(groups === undefined) {
		return function(req, res, next) {
			if(req.session_data && req.session_data.group_name) {
				callback(req, res, next);
			} else {
				res.status(401).send(); // not allowed
			}
		}
	}
	const group_list = Array.isArray(groups) ? groups : [groups];
	return function() {
		if(req.session_data && group_list.indexOf(req.session_data) !== -1) {
			callback(req, res, next);
		} else {
			res.status(401).send(); // not allowed
		}
	}
	
}
/*
import express from "private_router.js"; // import library
const app = express(); // create a default express app
app.use(express.urlencoded({extended:true})); // middleware for w-xxx-urlencoded form
const admin = express.acess_control("admin"); // get a private router for admin group
// wrapper the request handler to allow direct acess only to admin group
const admin_homepage = express.group_wrapper(function(req, res){
	console.log(`Admin has on homepage: ${req.session_data.name}`);
}
admin.get("/admin/homepage.html", admin_homepage), "admin");
*/
export default express;
