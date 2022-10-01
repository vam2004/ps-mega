import {
	getreader, closereader, stdask, getvalues, 
	requests, scape_quotes, empty_input, 
	parseError, scape_values
} from "./__common__.js";

const keys = ["username","usergroup", "userpass", "userdata"];
const values = await getvalues({ 
	ask: true, scape: false, keys 
});

const scaped = scape_values(keys, values);

const username = values.username;
const usergroup = values.usergroup;
const userpass = values.userpass;
const userdata = values.userdata;

if(username !== undefined && userpass !== undefined) {
	console.log(`Request for adding the user "${scaped.username}" of group "${scaped.usergroup}" with password "${scaped.userpass}" and userdata "${scaped.userdata}"`);
	requests.request(username, usergroup, userpass, userdata)
	.catch(function(err){
		console.log(`\nERROR: ${parseError(err)}`);
	});
}
