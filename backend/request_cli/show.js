import {
	getreader, closereader, stdask, getvalues, 
	requests, scape_quotes, empty_input, 
	parseError, scape_values
} from "./__common__.js";

const keys = ["username", "usergroup"];

const values = await getvalues({ 
	ask: false, scape: true, keys 
});

if(empty_input(values.username) && empty_input(values.usergroup)) {
	requests.showall();
} else if(empty_input(values.username)) {
	request.showgroup && request.showgroup(values.usergroup);
} else if(request.showuser) {
	request.showuser(values.username, values.usergroup);
}
 
	