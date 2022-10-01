import {
	getreader, closereader, stdask, getvalues, 
	requests, scape_quotes, empty_input, 
	parseError, scape_values
} from "./__common__.js";

const keys = ["username", "usergroup"];
const values = await getvalues({
	ask: true, scape: false, keys
});
const scaped = scape_values(keys, values);
if(values.username !== undefined && values.usergroup !== undefined) {
	console.log(`Acepptin request for adding the user "${scaped.username}" of group "${scaped.usergroup}"`);
	await requests.accept(values.username, values.usergroup);
}
